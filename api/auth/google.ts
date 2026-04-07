import { randomBytes } from 'node:crypto';
import { buildGoogleAuthUrl } from '../_lib/google-oauth';
import { verifyAdmin } from '../_lib/supabase-admin';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyAdmin(req);

    const state = randomBytes(24).toString('hex');
    const token = req.query.token || req.headers?.authorization?.replace('Bearer ', '');
    
    res.setHeader(
      'Set-Cookie',
      [
        `google_oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax`,
        `unscriptx_admin_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=300`
      ]
    );

    const authUrl = buildGoogleAuthUrl(state);
    return res.redirect(authUrl);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to start Google OAuth' });
  }
}
