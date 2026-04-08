import { createOAuthClient, saveGoogleTokens } from '../../_lib/google-oauth.js';
import { verifyAdmin } from '../../_lib/supabase-admin.js';

function parseCookies(rawCookie = '') {
  return rawCookie.split(';').reduce((acc: Record<string, string>, part: string) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

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
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const cookies = parseCookies(req.headers.cookie || '');
    const cookieState = cookies.google_oauth_state;
    const adminToken = cookies.unscriptx_admin_token;

    if (!code) return res.status(400).json({ error: 'Missing OAuth code' });
    if (!state || !cookieState || state !== cookieState) {
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }
    
    // Verify admin locally from the cookie
    if (!adminToken) return res.status(401).json({ error: 'Missing admin token in callback' });
    const mockReq = { headers: { authorization: `Bearer ${adminToken}` } };
    await verifyAdmin(mockReq);

    const oauth2Client = createOAuthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens || {};
    await saveGoogleTokens(tokens);

    res.setHeader(
      'Set-Cookie',
      'google_oauth_state=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0'
    );

    const redirectTo = process.env.GOOGLE_AUTH_SUCCESS_REDIRECT || '/admin';
    return res.redirect(redirectTo);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Google OAuth callback failed' });
  }
}
