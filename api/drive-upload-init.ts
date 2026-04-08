import { getDriveClientWithOAuth } from './_lib/google-oauth';
import { verifyUserToken } from './_lib/supabase-admin';

// Reusing same folder logic
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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifyUserToken(req);
    const { eventTitle, userId, registrationId, round, userName, fileName, mimeType, size } = req.body;

    if (!eventTitle || !fileName || !mimeType) {
      return res.status(400).json({ error: 'Missing required metadata fields' });
    }

    const drive = await getDriveClientWithOAuth();
    const folderId = await getOrCreateEventFolderId(drive, eventTitle);
    
    const cleanName = (userName || 'Student').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanEvent = (eventTitle || 'Event').replace(/[^a-zA-Z0-9 ]/g, '').trim();
    const cleanRound = (round || 'Round').replace(/_/g, ' ').replace('qualified', '').trim();
    const extension = fileName.split('.').pop() || 'mp4';

    const safeFileName = `${cleanName} - ${cleanEvent} - ${cleanRound} - ${Date.now()}.${extension}`;

    // IMPORTANT: Generate Resumable Upload URL to bypass Vercel 4.5MB limit
    const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await (drive.context._options.auth as any).getAccessToken()).token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': size.toString()
      },
      body: JSON.stringify({
        name: safeFileName,
        parents: [folderId],
      })
    });

    if (!initResponse.ok) {
        throw new Error('Google Drive API rejected resumable session');
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
        throw new Error('No resumable upload URL returned from Google Drive');
    }

    return res.status(200).json({
      uploadUrl,
      safeFileName
    });
  } catch (error: any) {
    console.error("Init upload error:", error);
    return res.status(500).json({
      error: error?.message || 'Failed to initialize Drive upload session',
    });
  }
}
