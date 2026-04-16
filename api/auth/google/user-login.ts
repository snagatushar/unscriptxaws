import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import { buildGoogleAuthUrl } from '../../_lib/google-oauth.js';

const USER_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const state = randomBytes(24).toString('hex');
    const isDev = process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost');
    
    // Construct the user-specific callback URI
    const protocol = isDev ? 'http' : 'https';
    const host = req.headers.host || 'www.unscriptx.com';
    const redirectUri = `${protocol}://${host}/api/auth/google/user-callback`;

    res.setHeader(
      'Set-Cookie',
      `google_user_oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600${!isDev ? '; Secure' : ''}`
    );

    const authUrl = buildGoogleAuthUrl(state, {
      redirectUri,
      scopes: USER_SCOPES
    });

    return res.redirect(authUrl);
  } catch (error: any) {
    console.error('Google User Login Start Error:', error);
    return res.status(500).json({ error: 'Failed to start Google login' });
  }
}
