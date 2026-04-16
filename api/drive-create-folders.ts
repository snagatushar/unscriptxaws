import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { verifyAdmin } from './_lib/auth-util.js';

const ALLOWED_ORIGIN = process.env.SITE_ORIGIN || 'https://www.unscriptx.com';

function setCors(res: any) {
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

function sanitize(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[^a-zA-Z0-9 ]/g, '').trim() || fallback;
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
      name: safeTitle,
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

/**
 * Proactively creates subcategory folders inside an event's Google Drive folder.
 * Called by the admin dashboard after creating/updating an event with subcategories.
 *
 * POST body: { eventTitle: string, subCategories: string[] }
 * Returns: { created: { name: string, folderId: string }[] }
 */
export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify the caller is an authenticated admin
    await verifyAdmin(req);

    const { eventTitle, subCategories } = req.body || {};

    if (!eventTitle || typeof eventTitle !== 'string') {
      return res.status(400).json({ error: 'eventTitle is required' });
    }
    if (!Array.isArray(subCategories) || subCategories.length === 0) {
      return res.status(400).json({ error: 'subCategories must be a non-empty array' });
    }

    const drive = await getDriveClientWithOAuth();

    // 1. Ensure the event folder exists
    const eventFolderId = await getOrCreateEventFolderId(drive, eventTitle);

    // 2. Create each subcategory folder inside the event folder
    const created: { name: string; folderId: string }[] = [];
    for (const sub of subCategories) {
      const trimmed = (sub || '').trim();
      if (!trimmed) continue;
      const folderId = await getOrCreateSubCategoryFolderId(drive, eventFolderId, trimmed);
      created.push({ name: trimmed, folderId });
    }

    return res.status(200).json({
      eventFolder: eventFolderId,
      created,
    });
  } catch (error: any) {
    console.error('Drive create-folders error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to create Drive folders',
    });
  }
}
