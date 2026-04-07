import { getDriveClientWithOAuth } from './_lib/google-oauth';
import { verifyUserToken } from './_lib/supabase-admin';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fileId = String(req.query.fileId || '');
    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    const user = await verifyUserToken(req);
    const drive = await getDriveClientWithOAuth();
    const metadata = await drive.files.get({
      fileId,
      fields: 'mimeType,name',
    });

    const fileResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    const stream = fileResponse.data;
    res.setHeader('Content-Type', metadata.data.mimeType || 'application/octet-stream');
    
    // Prevent XSS by forcing attachment for non-video files
    const isVideo = metadata.data.mimeType?.startsWith('video/');
    res.setHeader(
      'Content-Disposition', 
      `${isVideo ? 'inline' : 'attachment'}; filename="${metadata.data.name || fileId}"`
    );
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end('Failed to stream file');
      }
    });
    stream.pipe(res);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to get Drive stream URL',
    });
  }
}
