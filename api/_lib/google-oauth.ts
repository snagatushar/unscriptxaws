import { google } from 'googleapis';
import { query } from './db.js';

const TOKEN_ROW_ID = 'google_drive_owner';
const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function createOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri || requiredEnv('GOOGLE_REDIRECT_URI')
  );
}

export function buildGoogleAuthUrl(state: string, options?: { redirectUri?: string, scopes?: string[] }) {
  const oauth2Client = createOAuthClient(options?.redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: options?.scopes || DRIVE_SCOPE,
    state,
  });
}

export async function saveGoogleTokens(tokens: any) {
  const sql = `
    INSERT INTO google_oauth_tokens (id, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
      scope = EXCLUDED.scope,
      token_type = EXCLUDED.token_type,
      expiry_date = EXCLUDED.expiry_date,
      updated_at = EXCLUDED.updated_at
  `;
  
  await query(sql, [
    TOKEN_ROW_ID,
    tokens.access_token || null,
    tokens.refresh_token || null,
    tokens.scope || null,
    tokens.token_type || null,
    tokens.expiry_date || null,
    new Date().toISOString()
  ]);
}

export async function getStoredGoogleTokens() {
  const result = await query(
    'SELECT access_token, refresh_token, expiry_date, scope, token_type FROM google_oauth_tokens WHERE id = $1',
    [TOKEN_ROW_ID]
  );
  
  const data = result.rows[0];

  if (!data?.refresh_token && !data?.access_token) {
    throw new Error('Google Drive OAuth is not connected. Visit /api/auth/google first.');
  }

  return data;
}

export async function getDriveClientWithOAuth() {
  const oauth2Client = createOAuthClient();
  const stored = await getStoredGoogleTokens();
  oauth2Client.setCredentials({
    access_token: stored.access_token || undefined,
    refresh_token: stored.refresh_token || undefined,
    expiry_date: stored.expiry_date || undefined,
    scope: stored.scope || undefined,
    token_type: stored.token_type || undefined,
  });

  // Force token resolution; refresh happens automatically if expired and refresh_token exists.
  const tokenResponse = await oauth2Client.getAccessToken();
  if (!tokenResponse?.token) {
    throw new Error('Unable to obtain Google access token.');
  }

  const fresh = oauth2Client.credentials;
  if (fresh?.access_token || fresh?.refresh_token) {
    await saveGoogleTokens(fresh);
  }

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function getGoogleAccessToken(): Promise<string> {
  const oauth2Client = createOAuthClient();
  const stored = await getStoredGoogleTokens();
  oauth2Client.setCredentials({
    access_token: stored.access_token || undefined,
    refresh_token: stored.refresh_token || undefined,
    expiry_date: stored.expiry_date || undefined,
    scope: stored.scope || undefined,
    token_type: stored.token_type || undefined,
  });

  const tokenResponse = await oauth2Client.getAccessToken();
  if (!tokenResponse?.token) {
    throw new Error('Unable to obtain Google access token.');
  }

  // Persist any refreshed tokens
  const fresh = oauth2Client.credentials;
  if (fresh?.access_token || fresh?.refresh_token) {
    await saveGoogleTokens(fresh);
  }

  return tokenResponse.token;
}
