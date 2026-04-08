import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { verifyAdminOrJudge } from './_lib/supabase-admin.js';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const eventTitle = req.query.eventTitle as string;
  if (!eventTitle) return res.status(400).json({ error: 'eventTitle is required' });

  try {
    const user = await verifyAdminOrJudge(req);
    const drive = await getDriveClientWithOAuth();
    const rootFolderId = process.env.GDRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) throw new Error('GDRIVE_ROOT_FOLDER_ID not configured');

    const safeTitle = eventTitle.replace(/[^a-zA-Z0-9 ]/g, '_').trim();

    // 1. Find the event folder
    const listResponse = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and name='${safeTitle}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const folder = listResponse.data.files?.[0];
    if (!folder || !folder.id) {
       return res.status(200).json({ files: [], message: 'No folder found for this event' });
    }

    // 2. List all video files in that folder
    const filesResponse = await drive.files.list({
      q: `'${folder.id}' in parents and trashed=false and (mimeType contains 'video/' or mimeType contains 'application/octet-stream')`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      orderBy: 'createdTime desc',
    });

    const files = filesResponse.data.files || [];
    return res.status(200).json({ files });
  } catch (error: any) {
    console.error('List error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to list' });
  }
}
