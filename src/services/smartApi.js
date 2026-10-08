/**
 * Smart hiding & AI import endpoints (auto-syllables, homework photo, profile,
 * generated practice words). Thin wrappers over apiFetch, like coachingApi.js.
 */
import { apiFetch, API_ORIGIN, ApiError, AuthError, NetworkError } from './apiService';

/** { splits: { word: 'syl-la-ble' | null } } for words the bundled dictionary doesn't know. */
export const splitSyllables = (words) =>
  apiFetch('/api/spelling/syllables', { method: 'POST', body: { words: words.slice(0, 50) } });

const PHOTO_TIMEOUT_MS = 60000;

/**
 * Upload a re-encoded homework photo (raw JPEG body). Returns
 * { title, words, focus_groups, hints } to review; nothing is saved server-side.
 */
export async function importPhoto(blob) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${API_ORIGIN}/api/spelling/import/photo`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body: blob,
      signal: controller.signal
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401) throw new AuthError();
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`, res.status);
  return data;
}

/** { grade } — 0 = K .. 8 */
export const getProfile = () => apiFetch('/api/spelling/profile');
export const setGrade = (grade) => apiFetch('/api/spelling/profile', { method: 'PUT', body: { grade } });

/** { words, requested, rejected } — up to 5 grade-appropriate words with the pattern (20 requests/day). */
export const generatePatternWords = (pattern, exclude = []) =>
  apiFetch(`/api/spelling/patterns/${encodeURIComponent(pattern)}/generate`, {
    method: 'POST', body: { exclude: exclude.slice(0, 500) }
  });
