import { verifyUserToken } from './_lib/supabase-admin.js';

/**
 * Tell Vercel NOT to parse the request body — we need the raw binary chunk data.
 * This is critical: without this, Vercel's body parser will reject or corrupt the binary.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Upload-Url, X-Content-Range, X-Content-Type');
}

async function getRawBody(req: any): Promise<Buffer> {
  // Express (local dev) with express.raw() stores the buffer in req.body
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  // Vercel serverless: body is a readable stream, consume it manually
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Proxies a single file chunk from the browser to Google Drive.
 *
 * The browser sends a raw binary chunk (≤ 4 MB) along with:
 *   - X-Upload-Url:    the Google Drive resumable upload URL
 *   - X-Content-Range:  e.g. "bytes 0-4194303/50000000"
 *   - X-Content-Type:   the file's MIME type
 *
 * This function forwards the chunk to Google Drive and returns:
 *   - { status: 'incomplete' }  → more chunks expected (HTTP 308 from Google)
 *   - { status: 'complete', fileId, ... } → upload finished
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyUserToken(req);

    const uploadUrl = req.headers['x-upload-url'] as string | undefined;
    const contentRange = req.headers['x-content-range'] as string | undefined;
    const contentType = (req.headers['x-content-type'] as string) || 'application/octet-stream';

    if (!uploadUrl) {
      return res.status(400).json({ error: 'Missing X-Upload-Url header' });
    }
    // CRIT-2: Prevent SSRF — only allow Google Drive resumable upload URLs
    if (!uploadUrl.startsWith('https://www.googleapis.com/upload/drive/')) {
      return res.status(400).json({ error: 'Invalid upload URL' });
    }
    if (!contentRange) {
      return res.status(400).json({ error: 'Missing X-Content-Range header' });
    }
    // Validate Content-Range format: bytes start-end/total
    if (!/^bytes \d+-\d+\/\d+$/.test(contentRange)) {
      return res.status(400).json({ error: 'Invalid Content-Range format' });
    }

    // Read the raw binary chunk
    const body = await getRawBody(req);

    // Forward the chunk to Google Drive's resumable upload endpoint
    const bodyBytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    const driveRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(body.length),
        'Content-Range': contentRange,
        'Content-Type': contentType,
      },
      body: bodyBytes as any,
    });

    // 308 Resume Incomplete — chunk received, Google expects more
    if (driveRes.status === 308) {
      const range = driveRes.headers.get('range');
      return res.status(200).json({
        status: 'incomplete',
        range: range || null,
      });
    }

    // 200/201 — all chunks received, upload complete
    if (driveRes.status >= 200 && driveRes.status < 300) {
      const metadata = await driveRes.json();
      return res.status(200).json({
        status: 'complete',
        fileId: metadata.id,
        fileName: metadata.name,
        mimeType: metadata.mimeType,
        size: metadata.size,
        createdTime: metadata.createdTime,
      });
    }

    // Unexpected error from Google Drive
    // LOW-3: Log details server-side only — never send raw API responses to client
    const errText = await driveRes.text();
    console.error('Google Drive chunk error:', driveRes.status, errText);
    return res.status(502).json({
      error: `Upload failed. Please try again.`,
    });
  } catch (error: any) {
    console.error('Chunk upload error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to upload chunk',
    });
  }
}
