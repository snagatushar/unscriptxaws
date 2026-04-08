type UploadToDriveParams = {
  file: File;
  eventTitle: string;
  userId: string;
  registrationId: string;
  round: string;
  userName: string;
  onProgress?: (percent: number) => void;
};

import { supabase } from './supabase';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export async function uploadVideoToDrive(params: UploadToDriveParams) {
  const { file, eventTitle, userId, registrationId, round, userName, onProgress } = params;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('eventTitle', eventTitle);
  formData.append('userId', userId);
  formData.append('registrationId', registrationId);
  formData.append('round', round);
  formData.append('userName', userName);

  return new Promise<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: string;
    createdTime: string;
  }>(async (resolve, reject) => {
    try {
      const token = await getToken();
      
      // STEP 1: Ask Vercel backend to get a signed Resumable Upload URL from Google
      const initRes = await fetch('/api/drive-upload-init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventTitle,
          userId,
          registrationId,
          round,
          userName,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize upload');
      if (!initData.uploadUrl) throw new Error('No upload URL received from server');

      // STEP 2: Upload directly from the browser to Google Drive via XMLHttpRequest for Progress
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', initData.uploadUrl, true);
      // DO NOT set Authorization header here, Google uses the session UUID in the uploadUrl!
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      };

      xhr.onerror = () => reject(new Error('Network error during Google Drive upload'));

      xhr.onload = () => {
        let parsed: any = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {}

        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(parsed?.error?.message || 'Upload to Google Drive failed.'));
          return;
        }

        if (onProgress) onProgress(100);
        
        // Google Drive returns the uploaded file metadata in the response!
        resolve({
          fileId: parsed.id,
          fileName: initData.safeFileName || parsed.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size.toString(),
          createdTime: new Date().toISOString()
        });
      };

      // Send raw file bytes directly to Google!
      xhr.send(file);
    } catch (err: any) {
      reject(err);
    }
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
