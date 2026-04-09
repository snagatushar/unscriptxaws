import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { verifyUserToken } from './_lib/supabase-admin.js';

const ALLOWED_ORIGIN = process.env.SITE_ORIGIN || 'https://www.unscriptx.com';

function setCors(res: any) {
  // HIGH-2: Restrict CORS to production domain only, not wildcard
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
    // HIGH-4: Sanitize filename to prevent HTTP header injection.
    // Strip CRLF, quotes, backslash, and non-ASCII characters.
    const rawName = metadata.data.name || fileId;
    const safeFileName = rawName
      .replace(/[\r\n"\\]/g, '')       // strip CRLF, quotes, backslash
      .replace(/[^\x20-\x7E]/g, '_')   // replace non-ASCII with underscore
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
