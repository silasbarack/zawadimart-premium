// Thin client for the ZawadiMart API (see server/). In development Vite proxies
// /api to the local server; in production set VITE_API_URL to the API's origin.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'zawadimart-session';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const loadSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
};
export const saveSession = (session) => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable */ }
};

export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = loadSession()?.token;
  let response;
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('We could not reach ZawadiMart. Check your connection and try again.', 0);
  }
  if (response.status === 204) return null;
  const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
  if (!data) throw new ApiError('ZawadiMart is temporarily unavailable. Please try again shortly.', response.status);
  if (!response.ok) throw new ApiError(data.error || 'Something went wrong.', response.status, data.details);
  return data;
}

// Joins validation or stock messages into one readable sentence.
export const errorText = (error) => [error.message, ...(error.details || []).map((detail) => detail.message)]
  .filter((text, index, all) => text && all.indexOf(text) === index).join(' ');
