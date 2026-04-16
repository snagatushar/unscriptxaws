import { VercelRequest, VercelResponse } from '@vercel/node';
import { createOAuthClient } from '../../_lib/google-oauth.js';
import { query } from '../../_lib/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

function parseCookies(rawCookie = '') {
  return rawCookie.split(';').reduce((acc: Record<string, string>, part: string) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('=') || '');
    return acc;
  }, {});
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

    const cookies = parseCookies(req.headers.cookie || '');
    const cookieState = cookies.google_user_oauth_state;

    if (!state || !cookieState || state !== cookieState) {
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }

    const isDev = process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost');
    const protocol = isDev ? 'http' : 'https';
    const host = req.headers.host || 'www.unscriptx.com';
    const redirectUri = `${protocol}://${host}/api/auth/google/user-callback`;

    const oauth2Client = createOAuthClient(redirectUri);
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const oauth2 = oauth2Client.generateAuthUrl({ access_type: 'offline' }); // not actually needed, just for context
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    
    if (!userInfoRes.ok) throw new Error('Failed to fetch user info from Google');
    const googleUser = await userInfoRes.json();
    const { email, name, picture, sub: googleId } = googleUser;

    if (!email) return res.status(400).json({ error: 'Google account missing email' });

    // Disposable domain check
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      const blockedRes = await query('SELECT domain FROM blocked_domains WHERE domain = $1', [domain]);
      if (blockedRes.rows.length > 0) {
        return res.redirect(`/login?error=${encodeURIComponent('This email domain is not allowed.')}`);
      }
    }

    // RDS Sync: Upsert user
    const existing = await query('SELECT id, role FROM users WHERE email = $1', [email]);
    let user;

    if (existing.rows.length === 0) {
      // Create new user
      const insertRes = await query(
        `INSERT INTO users (id, full_name, email, role, google_id, avatar_url) VALUES (gen_random_uuid(), $1, $2, 'user', $3, $4) RETURNING id, role`,
        [name || email, email, googleId, picture || null]
      );
      user = insertRes.rows[0];
    } else {
      user = existing.rows[0];
      // Update google_id and avatar if missing
      await query(
        'UPDATE users SET google_id = COALESCE(google_id, $1), avatar_url = COALESCE(avatar_url, $2), full_name = COALESCE(full_name, $3) WHERE id = $4',
        [googleId, picture || null, name || null, user.id]
      );
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Cleanup state cookie
    res.setHeader(
      'Set-Cookie',
      'google_user_oauth_state=; HttpOnly; Path=/; Max-Age=0'
    );

    // Redirect to login with token
    return res.redirect(`/login?token=${encodeURIComponent(token)}`);
  } catch (error: any) {
    console.error('Google User Callback Error:', error);
    return res.redirect(`/login?error=${encodeURIComponent('Google login failed. Please try again.')}`);
  }
}
