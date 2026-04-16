import { getDriveClientWithOAuth, getGoogleAccessToken } from './_lib/google-oauth.js';
import { verifyUserToken } from './_lib/auth-util.js';

const ALLOWED_ORIGIN = process.env.SITE_ORIGIN || 'https://www.unscriptx.com';

function setCors(res: any) {
  // HIGH-2: Restrict CORS to production domain only, not wildcard
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

function requiredRootFolderId() {
  const value = process.env.GDRIVE_ROOT_FOLDER_ID;
  if (!value) {
    throw new Error('Missing GDRIVE_ROOT_FOLDER_ID env variable.');
  }
  return value;
}

function getFolderIdFromMap(eventTitle: string) {
  const rawMap = process.env.GDRIVE_EVENT_FOLDER_MAP_JSON;
  if (!rawMap) return null;
  try {
    const map = JSON.parse(rawMap) as Record<string, string>;
    return map[eventTitle] || null;
  } catch {
    return null;
  }
}

async function getOrCreateEventFolderId(drive: any, eventTitle: string) {
  const mappedFolderId = getFolderIdFromMap(eventTitle);
  if (mappedFolderId) return mappedFolderId;

  const rootFolderId = requiredRootFolderId();
  // MED-1: Use the sanitize helper to prevent query injection and handle special chars
  const safeTitle = sanitize(eventTitle, 'Event');
  const listResponse = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and name='${safeTitle}' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });

  const existing = listResponse.data.files?.[0];
  if (existing?.id) return existing.id;

  const createResponse = await drive.files.create({
    requestBody: {
      name: safeTitle, // Use sanitized title here too
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id,name',
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create event folder for "${eventTitle}"`);
  }
  return createResponse.data.id;
}

/**
 * Gets or creates a subcategory folder inside the event folder.
 * e.g., Root > Music > Solo Singing
 */
async function getOrCreateSubCategoryFolderId(drive: any, parentFolderId: string, subCategory: string) {
  const safeName = sanitize(subCategory, 'General');
  const listResponse = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and name='${safeName}' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: 1,
  });

  const existing = listResponse.data.files?.[0];
  if (existing?.id) return existing.id;

  const createResponse = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id,name',
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create subcategory folder for "${subCategory}"`);
  }
  return createResponse.data.id;
}

function sanitize(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[^a-zA-Z0-9 ]/g, '').trim() || fallback;
}

function sanitizeRound(rawRound: string | undefined) {
  const cleaned = (rawRound || 'Round').replace(/_/g, ' ').replace(/qualified/gi, '').trim();
  return cleaned || 'Round';
}

/**
 * Lightweight serverless function that initiates a Google Drive resumable upload.
 * Returns the resumable upload URL so the client can upload directly to Google Drive,
 * bypassing Vercel's 4.5MB payload limit completely.
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyUserToken(req);

    const { eventTitle, userName, round, subCategory, mimeType, fileName, fileSize } = req.body || {};

    if (!eventTitle) {
      return res.status(400).json({ error: 'eventTitle is required' });
    }
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Extract the browser origin — Google Drive requires this for CORS on resumable uploads
    const origin = req.headers?.origin
      || (req.headers?.referer ? new URL(req.headers.referer).origin : null)
      || process.env.SITE_ORIGIN
      || 'https://www.unscriptx.com';

    const drive = await getDriveClientWithOAuth();
    let folderId = await getOrCreateEventFolderId(drive, eventTitle);

    // If a subcategory is provided, create/find a subfolder inside the event folder
    if (subCategory && subCategory.trim()) {
      folderId = await getOrCreateSubCategoryFolderId(drive, folderId, subCategory);
    }

    // Build the file name for Google Drive
    const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const safeFileName = `${sanitize(userName, 'Student')} - ${sanitize(eventTitle, 'Event')} - ${sanitizeRound(round)} - ${Date.now()}.${ext}`;

    const finalMimeType = mimeType || 'application/octet-stream';

    // Get a fresh access token for the direct REST API call
    const accessToken = await getGoogleAccessToken();

    // Initiate a resumable upload session directly via the Google Drive REST API
    // The 'origin' query parameter is CRITICAL — without it Google won't return
    // CORS headers and the browser will block the upload with a network error.
    const uploadInitUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size,createdTime&origin=${encodeURIComponent(origin)}`;
    const initResponse = await fetch(
      uploadInitUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': finalMimeType,
          ...(fileSize ? { 'X-Upload-Content-Length': String(fileSize) } : {}),
        },
        body: JSON.stringify({
          name: safeFileName,
          parents: [folderId],
        }),
      }
    );

    if (!initResponse.ok) {
      const errBody = await initResponse.text();
      console.error('Google Drive resumable init failed:', initResponse.status, errBody);
      throw new Error(`Google Drive init failed: ${initResponse.status}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('Google Drive did not return a resumable upload URL.');
    }

    return res.status(200).json({
      uploadUrl,
      fileName: safeFileName,
    });
  } catch (error: any) {
    console.error('Drive init-upload error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to initiate Drive upload',
    });
  }
}
