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
  }>((resolve, reject) => {
    getToken()
      .then((token) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/drive-upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (!onProgress || !event.lengthComputable) return;
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        };

        xhr.onerror = () => reject(new Error('Drive upload failed'));

        xhr.onload = () => {
          let parsed: any = {};
          try {
            parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch {
            parsed = {};
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(parsed.error || 'Drive upload failed'));
            return;
          }

          if (onProgress) onProgress(100);
          resolve(parsed);
        };

        xhr.send(formData);
      })
      .catch(reject);
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
