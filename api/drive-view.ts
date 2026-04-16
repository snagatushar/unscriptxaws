import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { verifyUserToken } from './_lib/auth-util.js';
import { query } from './_lib/db.js';

const ALLOWED_ORIGIN = process.env.SITE_ORIGIN || 'https://www.unscriptx.com';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
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
    
    // Ownership check: If not admin, check if fileId belongs to user's submissions
    if (user.role !== 'admin') {
       const ownershipRes = await query(`
         SELECT s.id 
         FROM submissions s
         JOIN registrations r ON s.registration_id = r.id
         WHERE s.video_url = $1 AND r.user_id = $2
       `, [fileId, user.id]);

       if (ownershipRes.rows.length === 0) {
          const backupCheck = await query(`
            SELECT s.id FROM submissions s 
            JOIN registrations r ON s.registration_id = r.id 
            WHERE s.video_path = $1 AND r.user_id = $2
          `, [fileId, user.id]);
          
          if (backupCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Permission denied. You do not own this file.' });
          }
       }
    }

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
    const rawName = metadata.data.name || fileId;
    const safeFileName = rawName
      .replace(/[\r\n"\\]/g, '')
      .replace(/[^\x20-\x7E]/g, '_')
      .trim() || 'video';
    const isVideo = metadata.data.mimeType?.startsWith('video/') ?? false;
    res.setHeader('Content-Type', metadata.data.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition', 
      `${isVideo ? 'inline' : 'attachment'}; filename="${safeFileName}"`
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
