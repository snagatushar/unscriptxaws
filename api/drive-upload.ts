import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import formidable from 'formidable';
import type { File as FormidableFile, Fields } from 'formidable';
import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { verifyUserToken } from './_lib/auth-util.js';

type ParsedUpload = {
  fields: Fields;
  file: FormidableFile;
};

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function parseUploadForm(req: any): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      const uploaded = files.file;
      if (!uploaded) {
        return reject(new Error('Missing file upload'));
      }

      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (!file) {
        return reject(new Error('Missing file upload entry'));
      }

      resolve({ fields, file });
    });
  });
}

function getValue(value: string | string[] | undefined, fallback = '') {
  if (!value) return fallback;
  return Array.isArray(value) ? value[0] : value;
}

function sanitize(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/[^a-zA-Z0-9 ]/g, '').trim() || fallback;
}

function sanitizeRound(rawRound: string | undefined) {
  const cleaned = (rawRound || 'Round').replace(/_/g, ' ').replace(/qualified/gi, '').trim();
  return cleaned || 'Round';
}

function getExtension(filename: string | undefined) {
  const name = filename || '';
  const parts = name.split('.');
  if (parts.length <= 1) return 'mp4';
  return parts.pop()?.toLowerCase() || 'mp4';
}

function getFolderIdFromMap(eventTitle: string) {
  const rawMap = process.env.GDRIVE_EVENT_FOLDER_MAP_JSON;
  if (!rawMap) return null;
  try {
    const map = JSON.parse(rawMap) as Record<string, string>;
    return map[eventTitle] || null;
  } catch (error) {
    console.warn('Invalid GDRIVE_EVENT_FOLDER_MAP_JSON', error);
    return null;
  }
}

function requiredRootFolderId() {
  const value = process.env.GDRIVE_ROOT_FOLDER_ID;
  if (!value) {
    throw new Error('Missing GDRIVE_ROOT_FOLDER_ID env variable.');
  }
  return value;
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

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let uploadedFilePath: string | undefined;
  try {
    await verifyUserToken(req);
    const { fields, file } = await parseUploadForm(req);
    uploadedFilePath = file.filepath;

    const eventTitle = getValue(fields.eventTitle, '').trim();
    const round = getValue(fields.round, '');
    const userName = getValue(fields.userName, 'Student');
    const subCategory = getValue(fields.subCategory, '').trim();
    const mimeType = file.mimetype || 'application/octet-stream';
    const extension = getExtension(file.originalFilename);

    if (!eventTitle) {
      throw new Error('eventTitle is required');
    }

    const drive = await getDriveClientWithOAuth();
    let folderId = await getOrCreateEventFolderId(drive, eventTitle);

    // If a subcategory is provided, create/find a subfolder inside the event folder
    if (subCategory) {
      folderId = await getOrCreateSubCategoryFolderId(drive, folderId, subCategory);
    }

    const safeFileName = `${sanitize(userName, 'Student')} - ${sanitize(eventTitle, 'Event')} - ${sanitizeRound(round)} - ${Date.now()}.${extension}`;

    const mediaStream = createReadStream(file.filepath);
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: safeFileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: mediaStream,
      },
      fields: 'id,name,mimeType,size,createdTime',
    });

    await unlink(file.filepath).catch(() => {});

    const metadata = uploadResponse.data;
    return res.status(200).json({
      fileId: metadata.id,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      createdTime: metadata.createdTime,
    });
  } catch (error: any) {
    if (uploadedFilePath) {
      await unlink(uploadedFilePath).catch(() => {});
    }
    console.error('Drive upload error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to upload to Drive',
    });
  }
}
