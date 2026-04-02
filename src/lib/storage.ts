import { supabase } from './supabase';

function extractPaymentsPath(value: string) {
  const publicPrefix = '/storage/v1/object/public/payments/';
  const signPrefix = '/storage/v1/object/sign/payments/';

  if (!value) return value;
  if (!value.startsWith('http')) return value;

  try {
    const url = new URL(value);

    if (url.pathname.includes(publicPrefix)) {
      return decodeURIComponent(url.pathname.split(publicPrefix)[1] || '');
    }

    if (url.pathname.includes(signPrefix)) {
      return decodeURIComponent(url.pathname.split(signPrefix)[1] || '');
    }

    const pathParts = url.pathname.split('/payments/');
    if (pathParts[1]) {
      return decodeURIComponent(pathParts[1]);
    }
  } catch {
    return value;
  }

  return value;
}

export async function openPaymentScreenshot(value: string) {
  const path = extractPaymentsPath(value);
  if (!path) {
    throw new Error('Payment screenshot path is missing.');
  }

  const { data, error } = await supabase.storage.from('payments').createSignedUrl(path, 60 * 10);
  if (error) throw error;

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
