import formidable from 'formidable';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { getDriveClientWithOAuth } from './_lib/google-oauth';
import { verifyUserToken } from './_lib/supabase-admin';

const MAX_UPLOAD_BYTES = 800 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false,
  },
};

function getFolderIdFromMap(eventTitle: string) {
  const rawMap = process.env.GDRIVE_EVENT_FOLDER_MAP_JSON;
  if (!rawMap) return null;

  const map = JSON.parse(rawMap) as Record<string, string>;
  return map[eventTitle] || null;
}

function requiredRootFolderId() {
  const value = process.env.GDRIVE_ROOT_FOLDER_ID;
  if (!value) {
    throw new Error('Missing GDRIVE_ROOT_FOLDER_ID env variable.');
  }
  return value;
}

async function getOrCreateEventFolderId(drive: any, eventTitle: string) {
  const mappedFolderId = getFolderIdFromMap(eventTitle);
  if (mappedFolderId) return mappedFolderId;

  const rootFolderId = requiredRootFolderId();
  const safeTitle = eventTitle.replace(/'/g, "\\'");
  const listResponse = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and name='${safeTitle}' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });

  const existing = listResponse.data.files?.[0];
  if (existing?.id) return existing.id;

  const createResponse = await drive.files.create({
    requestBody: {
      name: eventTitle,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id,name',
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create event folder for "${eventTitle}"`);
  }

  return createResponse.data.id;
}

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseMultipart(req);
    const eventTitle = firstField(fields.eventTitle);
    const userId = firstField(fields.userId);
    const registrationId = firstField(fields.registrationId);
    const round = firstField(fields.round);
    const userNameRaw = firstField(fields.userName);
    const uploadedFile = firstFile(files.file);

    if (!eventTitle || !userId || !registrationId || !round || !uploadedFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (uploadedFile.size > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: 'File too large. Maximum size is 800MB.' });
    }

    const user = await verifyUserToken(req);

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!uploadedFile.mimetype || !allowedTypes.includes(uploadedFile.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only standard video formats allowed.' });
    }

    // Use the userName passed from the frontend (which is the Participant Name from the registration)
    const userName = userNameRaw;

    const drive = await getDriveClientWithOAuth();
    const folderId = await getOrCreateEventFolderId(drive, eventTitle);
    
    // Preparation for a very clean, administrative filename
    const cleanName = (userName || 'Student').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanEvent = (eventTitle || 'Event').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanRound = (round || 'Round').replace(/_/g, ' ').replace('qualified', '').trim();
    const extension = (uploadedFile.originalFilename || 'video.mp4').split('.').pop() || 'mp4';

    const safeFileName = `${cleanName} - ${cleanEvent} - ${cleanRound} - ${Date.now()}.${extension}`;
    const fileStream = createReadStream(uploadedFile.filepath);

    const createResponse = await drive.files.create({
      requestBody: {
        name: safeFileName,
        parents: [folderId],
      },
      media: {
        mimeType: uploadedFile.mimetype || 'application/octet-stream',
        body: fileStream as any,
      },
      fields: 'id,name,mimeType,size,createdTime',
    });
    await unlink(uploadedFile.filepath).catch(() => undefined);

    const file = createResponse.data;

    return res.status(200).json({
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Drive upload failed',
    });
  }
}

async function parseMultipart(req: any) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_UPLOAD_BYTES,
    keepExtensions: true,
  });

  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function firstField(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function firstFile(value: any) {
  if (Array.isArray(value)) return value[0];
  return value;
}
