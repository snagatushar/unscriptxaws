import { google } from 'googleapis';
import { getSupabaseAdmin } from './supabase-admin.js';

const TOKEN_ROW_ID = 'google_drive_owner';
const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive.file'];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    requiredEnv('GOOGLE_CLIENT_ID'),
    requiredEnv('GOOGLE_CLIENT_SECRET'),
    requiredEnv('GOOGLE_REDIRECT_URI')
  );
}

export function buildGoogleAuthUrl(state: string) {
  const oauth2Client = createOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
    state,
  });
}

export async function saveGoogleTokens(tokens: any) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('google_oauth_tokens').upsert(
    {
      id: TOKEN_ROW_ID,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      scope: tokens.scope || null,
      token_type: tokens.token_type || null,
      expiry_date: tokens.expiry_date || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function getStoredGoogleTokens() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('access_token, refresh_token, expiry_date, scope, token_type')
    .eq('id', TOKEN_ROW_ID)
    .maybeSingle();

  if (error) throw error;
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

/**
 * Returns a valid Google OAuth2 access token (refreshing if needed).
 * Useful for direct REST API calls (e.g. initiating a resumable upload).
 */
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
