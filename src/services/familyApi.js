/**
 * Family accounts: child profiles and the adult PIN. User-level endpoints (they ignore the
 * active learner). Thin wrappers over apiFetch so components and tests have one place to mock.
 */
import { apiFetch } from './apiService';

/** { learners: [{ id, kind, role, display_name, avatar, grade, can_assign, can_view_reports }], pin_set, max_children, avatars } */
export const getFamily = () => apiFetch('/api/spelling/family');

export const addChild = ({ display_name, avatar, grade }) =>
  apiFetch('/api/spelling/family/learners', { method: 'POST', body: { display_name, avatar, grade } });

export const updateChild = (id, patch) =>
  apiFetch(`/api/spelling/family/learners/${encodeURIComponent(id)}`, { method: 'PUT', body: patch });

export const deleteChild = (id) =>
  apiFetch(`/api/spelling/family/learners/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Resolves { ok: true }; rejects with ApiError 403 (wrong, `remaining` in the message) or 429 (locked). */
export const verifyPin = (pin) => apiFetch('/api/spelling/family/pin/verify', { method: 'POST', body: { pin } });

export const setPin = (pin, currentPin) =>
  apiFetch('/api/spelling/family/pin', { method: 'PUT', body: { pin, ...(currentPin ? { current_pin: currentPin } : {}) } });

export const removePin = (pin) => apiFetch('/api/spelling/family/pin', { method: 'DELETE', body: { pin } });

/** A friendly sentence for any failure from the family endpoints. */
export function familyErrorMessage(err) {
  if (err?.name === 'AuthError') return 'Log in again to continue.';
  if (err?.name === 'NetworkError') return "You're offline. Try again when you're back online.";
  if (err?.status === 429) return 'Too many wrong tries. Please wait a few minutes.';
  if (typeof err?.message === 'string' && err.name === 'ApiError') return err.message;
  return 'Something went wrong. Please try again.';
}

/** One summary per child this adult follows: { learners: [{ ...child, summary }], as_of } */
export const getOverview = () => apiFetch('/api/spelling/supervisor/overview');

/** The data behind a printable report. from/to are inclusive 'YYYY-MM-DD'; omit both for the last 28 days. */
export const getReport = (learnerId, { from, to } = {}) => {
  const q = new URLSearchParams({ learner: learnerId });
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  return apiFetch(`/api/spelling/supervisor/report?${q}`);
};
