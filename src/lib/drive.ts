import { supabase } from './supabase';

type UploadToDriveParams = {
  file: File;
  eventTitle: string;
  userId: string;
  registrationId: string;
  round: string;
  userName: string;
  onProgress?: (percent: number) => void;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

/**
 * Two-phase upload flow that works around Vercel's 4.5MB serverless payload limit:
 *
 * Phase 1 — Call our lightweight `/api/drive-init-upload` endpoint.
 *           This creates a Google Drive resumable upload session and returns the
 *           upload URL. Only a tiny JSON body is sent to Vercel.
 *
 * Phase 2 — Upload the file directly from the browser to Google Drive using
 *           the resumable upload URL. No payload passes through Vercel at all.
 */
export async function uploadVideoToDrive(params: UploadToDriveParams) {
  const { file, eventTitle, userId, registrationId, round, userName, onProgress } = params;

  // ── Phase 1: Initiate the resumable upload via our serverless function ──
  const token = await getToken();
  const initRes = await fetch('/api/drive-init-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      eventTitle,
      userId,
      registrationId,
      round,
      userName,
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name,
      fileSize: file.size,
    }),
  });

  if (!initRes.ok) {
    const errBody = await initRes.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to initiate upload (${initRes.status})`);
  }

  const { uploadUrl, fileName } = await initRes.json();

  // ── Phase 2: Upload the file directly to Google Drive ──
  return new Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: string;
    createdTime: string;
  }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
    };

    xhr.onerror = () => reject(new Error('Network error during Google Drive upload'));

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let errMsg = 'Upload to Google Drive failed.';
        try {
          const parsed = JSON.parse(xhr.responseText);
          errMsg = parsed?.error?.message || errMsg;
        } catch {}
        reject(new Error(errMsg));
        return;
      }

      if (onProgress) onProgress(100);

      try {
        const metadata = JSON.parse(xhr.responseText);
        resolve({
          fileId: metadata.id,
          fileName: metadata.name || fileName,
          mimeType: metadata.mimeType || file.type || 'application/octet-stream',
          size: metadata.size?.toString() || file.size.toString(),
          createdTime: metadata.createdTime || new Date().toISOString(),
        });
      } catch {
        reject(new Error('Failed to parse Google Drive upload response'));
      }
    };

    xhr.send(file);
  });
}

export async function getDriveStreamUrl(fileId: string) {
  if (!fileId) {
    throw new Error('Missing file id');
  }
  const token = await getToken();
  return `/api/drive-view?fileId=${encodeURIComponent(fileId)}&token=${token}`;
}

export async function getEventDriveFiles(eventTitle: string) {
  const token = await getToken();
  const url = `/api/drive-list-event?eventTitle=${encodeURIComponent(eventTitle)}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
     const err = await response.json().catch(() => ({}));
     throw new Error(err.error || 'Failed to fetch event files from Drive');
  }
  return response.json() as Promise<{ files: any[] }>;
}
