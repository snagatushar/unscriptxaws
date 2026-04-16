/**
 * Standard API client for Unscriptx AWS Backend
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface RequestOptions extends RequestInit {
  useAuth?: boolean;
}

export async function apiFetch<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { useAuth = true, ...fetchOptions } = options;
  
  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (useAuth) {
    const token = localStorage.getItem('unscriptx_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

/**
 * Specialized helpers for common API patterns
 */
export const api = {
  get: <T>(endpoint: string, useAuth = true) => apiFetch<T>(endpoint, { method: 'GET', useAuth }),
  post: <T>(endpoint: string, body: any, useAuth = true) => 
    apiFetch<T>(endpoint, { method: 'POST', body: JSON.stringify(body), useAuth }),
};
