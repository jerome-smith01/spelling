/**
 * Spelling Tutor — API service
 *
 * In production the app is served from goodplusfast.com/spelling/app/, so every
 * call is same-origin (`/api/auth/*`, `/api/spelling/*`) and the HttpOnly session
 * cookie travels automatically. Set VITE_API_ORIGIN (e.g. https://www.goodplusfast.com)
 * for builds served from another origin, such as the Capacitor Android app.
 */
export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');

export class AuthError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'AuthError';
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network unavailable') {
    super(message);
    this.name = 'NetworkError';
  }
}

const TIMEOUT_MS = 10000;

export async function apiFetch(path, { method = 'GET', body, headers, keepalive } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_ORIGIN}${path}`, {
      method,
      credentials: 'include',
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      keepalive
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.error === 'string') message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Current GPF user, or null when not logged in. Other failures propagate. */
export async function getMe() {
  try {
    const data = await apiFetch('/api/auth/me');
    return data?.user ?? null;
  } catch (err) {
    if (err instanceof AuthError) return null;
    throw err;
  }
}

export function logout() {
  return apiFetch('/api/auth/logout', { method: 'POST' });
}

/** Login URL that returns the user to the exact page they are on. */
export function buildLoginUrl(mode = 'login') {
  const here = window.location.pathname + window.location.search + window.location.hash;
  return `${API_ORIGIN}/login?mode=${mode}&redirect=${encodeURIComponent(here)}`;
}

export const ACCOUNT_URL = `${API_ORIGIN}/account`;
