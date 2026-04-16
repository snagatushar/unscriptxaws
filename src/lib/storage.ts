export async function uploadToS3(file: File, folder: string): Promise<{ key: string, publicUrl: string }> {
  const fileType = file.type || 'application/octet-stream';
  const fileName = file.name;

  // 1. Get presigned URL
  const response = await fetch('/api/s3-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileType, folder })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get upload URL');
  }

  const { uploadUrl, key, publicUrl } = await response.json();

  // 2. Upload file directly to S3
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': fileType },
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to S3');
  }

  return { key, publicUrl };
}

export async function deleteFromS3(key: string): Promise<void> {
  const response = await fetch('/api/s3-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete file from S3');
  }
}

export async function openPaymentScreenshot(value: string) {
  if (!value) throw new Error('Payment screenshot path is missing.');

  // Check if it's already a full http URL (e.g. from an older storage structure)
  if (value.startsWith('http')) {
     window.open(value, '_blank', 'noopener,noreferrer');
     return;
  }

  const response = await fetch(`/api/s3-presign-view?key=${encodeURIComponent(value)}`);
  
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.error || 'Failed to get file URL');
  }

  const { viewUrl } = await response.json();
  window.open(viewUrl, '_blank', 'noopener,noreferrer');
}

export async function openIdCard(value: string) {
  if (!value) throw new Error('ID card path is missing.');

  if (value.startsWith('http')) {
     window.open(value, '_blank', 'noopener,noreferrer');
     return;
  }

  const response = await fetch(`/api/s3-presign-view?key=${encodeURIComponent(value)}`);
  
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({}));
     throw new Error(errorData.error || 'Failed to get file URL');
  }

  const { viewUrl } = await response.json();
  window.open(viewUrl, '_blank', 'noopener,noreferrer');
}
