/**
 * Struggle / pattern endpoints (Phase 5). Thin wrappers over apiFetch so components
 * and tests have one place to mock.
 */
import { apiFetch } from './apiService';

export const getScores = () => apiFetch('/api/spelling/scores');

export const getPatterns = () => apiFetch('/api/spelling/patterns');

/** One word's score plus per-letter results and its cached tip. */
export const getWordDetail = (word) => apiFetch(`/api/spelling/scores/${encodeURIComponent(word)}`);

/** Newest weekly digest, or null. */
export const getLatestDigest = () => apiFetch('/api/spelling/digest/latest');

export const getDigestPrefs = () => apiFetch('/api/spelling/digest/prefs');

/** Turn the weekly digest email on or off (off by default). */
export const setDigestEmail = (enabled) =>
  apiFetch('/api/spelling/digest/prefs', { method: 'PUT', body: { email_opt_in: !!enabled } });

/** Kid tip for a struggling word: { tip, mnemonic, breakdown, cached } */
export const analyzeWord = (word) =>
  apiFetch(`/api/spelling/scores/${encodeURIComponent(word)}/analyze`, { method: 'POST', body: {} });

/** Parent report for an active pattern: { summary, why_it_happens, practice_ideas, example_words, cached } */
export const analyzePattern = (pattern) =>
  apiFetch(`/api/spelling/patterns/${encodeURIComponent(pattern)}/analyze`, { method: 'POST', body: {} });

/** A friendly sentence for any failure from the analyze endpoints. */
export function coachingErrorMessage(err) {
  if (err?.name === 'AuthError') return 'Log in again to see coaching tips.';
  if (err?.name === 'NetworkError') return "You're offline. Try again when you're back online.";
  switch (err?.status) {
    case 503: return 'Tips are resting for today. Please try again tomorrow.';
    case 429: return "You've used all of today's tips. Please try again tomorrow.";
    case 409: return 'This one is not tricky enough for a tip yet. Keep practicing!';
    case 404: return 'We could not find that one.';
    default: return 'Tips are not available right now. Please try again later.';
  }
}
