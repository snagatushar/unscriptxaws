import 'dotenv/config';
import fs from 'fs';
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
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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
          title
        )
      `)
      .eq('id', registrationId)
      .eq('user_id', user.id)
      .single();

    if (registrationError || !registration) {
      throw new Error('Registration not found for this user.');
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

    // TODO: Implement your new storage method here.
    // For now, we've removed Google Drive logic as requested.
    
    const { error: updateError } = await supabaseAdmin
      .from('registrations')
      .update({
        submission_status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return res.status(200).json({
      message: 'Video received. (Google Drive integration removed.)',
    });
  } catch (error) {
    console.error('[ERROR] Upload Handler:', error);
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return res.status(400).json({ message });
  } finally {
    await cleanupTempFile(uploadedTempFilePath);
  }
}
