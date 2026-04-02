import 'dotenv/config';
import fs from 'fs';
import { google } from 'googleapis';
import formidable, { type File as FormidableFile } from 'formidable';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleServiceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const googleServiceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const driveAuth = new google.auth.JWT({
  email: googleServiceAccountEmail,
  key: googleServiceAccountPrivateKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({
  version: 'v3',
  auth: driveAuth,
});

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'submission';
}

function getRoundFolderName(qualificationStage: string) {
  switch (qualificationStage) {
    case 'round_1_qualified':
      return 'Round 2';
    case 'round_2_qualified':
      return 'Semifinal';
    case 'semifinal':
      return 'Final';
    case 'final':
      return 'Final';
    case 'not_started':
    default:
      return 'Round 1';
  }
}

async function ensureDriveFolder(folderName: string, parentFolderId: string) {
  const existingFolders = await drive.files.list({
    q: [
      `mimeType = 'application/vnd.google-apps.folder'`,
      `name = '${folderName.replace(/'/g, "\\'")}'`,
      `'${parentFolderId}' in parents`,
      'trashed = false',
    ].join(' and '),
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'allDrives',
  });

  const existingFolderId = existingFolders.data.files?.[0]?.id;
  if (existingFolderId) {
    return existingFolderId;
  }

  const createdFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  if (!createdFolder.data.id) {
    throw new Error(`Unable to create Google Drive folder: ${folderName}`);
  }

  return createdFolder.data.id;
}

function getFirstFieldValue(field: string | string[] | undefined) {
  if (Array.isArray(field)) {
    return field[0];
  }

  return field;
}

function getFirstFile(file: FormidableFile | FormidableFile[] | undefined) {
  if (Array.isArray(file)) {
    return file[0];
  }

  return file;
}

async function cleanupTempFile(tempPath?: string) {
  if (!tempPath) return;

  try {
    await fs.promises.unlink(tempPath);
  } catch {
    // Ignore cleanup failures after request completion.
  }
}

async function parseMultipartForm(req: any) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 500 * 1024 * 1024,
  });

  return new Promise<{ fields: Record<string, string | string[] | undefined>; files: Record<string, FormidableFile | FormidableFile[] | undefined> }>((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        fields,
        files,
      });
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  let uploadedTempFilePath: string | undefined;

  try {
    const authorizationHeader = req.headers.authorization;
    const accessToken = authorizationHeader?.startsWith('Bearer ')
      ? authorizationHeader.slice('Bearer '.length)
      : null;

    if (!accessToken) {
      return res.status(401).json({ message: 'Missing access token.' });
    }

    const { fields, files } = await parseMultipartForm(req);
    const registrationId = getFirstFieldValue(fields.registrationId);
    const uploadedFile = getFirstFile(files.file);

    if (!registrationId) {
      return res.status(400).json({ message: 'registrationId is required.' });
    }

    if (!uploadedFile) {
      return res.status(400).json({ message: 'No file received.' });
    }

    uploadedTempFilePath = uploadedFile.filepath;

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      throw new Error('Unable to verify login session.');
    }

    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('registrations')
      .select(`
        id,
        user_id,
        payment_status,
        upload_enabled,
        qualification_stage,
        events (
          id,
          title,
          drive_folder_id
        )
      `)
      .eq('id', registrationId)
      .eq('user_id', user.id)
      .single();

    if (registrationError || !registration) {
      throw new Error('Registration not found for this user.');
    }

    const event = Array.isArray(registration.events) ? registration.events[0] : registration.events;

    if (!event?.drive_folder_id) {
      throw new Error('Google Drive folder is not configured for this event yet.');
    }

    if (registration.payment_status !== 'approved') {
      throw new Error('Payment is not approved for this registration.');
    }

    if (!registration.upload_enabled) {
      throw new Error('Upload is not enabled for this event yet.');
    }

    if (registration.qualification_stage === 'eliminated') {
      throw new Error('Upload is locked for eliminated participants.');
    }

    const extension = uploadedFile.originalFilename ? `.${uploadedFile.originalFilename.split('.').pop()}`.replace(/\.+/, '.') : '';
    const eventPart = sanitizeFilePart(event.title || 'event');
    const stagePart = sanitizeFilePart(registration.qualification_stage || 'submission');
    const userPart = sanitizeFilePart(user.email || user.id);
    const driveFileName = `${eventPart}-${stagePart}-${userPart}-${Date.now()}${extension}`;
    const roundFolderName = getRoundFolderName(registration.qualification_stage || 'not_started');
    const roundFolderId = await ensureDriveFolder(roundFolderName, event.drive_folder_id);

    const uploadedDriveFile = await drive.files.create({
      requestBody: {
        name: driveFileName,
        parents: [roundFolderId],
      },
      media: {
        mimeType: uploadedFile.mimetype || 'application/octet-stream',
        body: fs.createReadStream(uploadedFile.filepath),
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = uploadedDriveFile.data.id;
    if (!fileId) {
      throw new Error('Google Drive did not return a file id.');
    }

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    const fileMeta = await drive.files.get({
      fileId,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const driveViewUrl =
      fileMeta.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    const driveDownloadUrl =
      fileMeta.data.webContentLink || `https://drive.google.com/uc?id=${fileId}&export=download`;

    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({
        drive_file_id: fileId,
        drive_view_url: driveViewUrl,
        drive_download_url: driveDownloadUrl,
        submission_status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return res.status(200).json({
      fileId,
      driveViewUrl,
      driveDownloadUrl,
      message: 'Video uploaded to Google Drive successfully.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return res.status(400).json({ message });
  } finally {
    await cleanupTempFile(uploadedTempFilePath);
  }
}
