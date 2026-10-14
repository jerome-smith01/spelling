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

/** Assign one of your lists: { list_id, learner_ids, due_at? } -> { assigned } (404 if the list is not saved to your account yet) */
export const assignList = ({ list_id, learner_ids, due_at }) =>
  apiFetch('/api/spelling/assignments', { method: 'POST', body: { list_id, learner_ids, ...(due_at ? { due_at } : {}) } });

export const removeAssignment = (id) => apiFetch(`/api/spelling/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** Lists assigned to the active learner, with progress and the words: [{ assignment_id, list_id, list_name, due_at, percent, complete, words_raw, focus_groups, hints }] */
export const getAssignedLists = () => apiFetch('/api/spelling/assigned-lists');

// ── Invite codes and who can see a learner (F5) ──

/** { kind: 'share_child', learner_id, role } or { kind: 'link_me', role }; role is 'guardian' | 'teacher'. -> { code, expires_at } */
export const createInvite = (body) => apiFetch('/api/spelling/family/invites', { method: 'POST', body });
export const listInvites = () => apiFetch('/api/spelling/family/invites');
export const revokeInvite = (code) => apiFetch(`/api/spelling/family/invites/${encodeURIComponent(code)}`, { method: 'DELETE' });

/** What accepting a code would do: { kind, role, inviter, child_name, can_assign, can_view_reports, expires_at } */
export const previewInvite = (code) => apiFetch(`/api/spelling/family/invites/${encodeURIComponent(code)}/preview`);
export const acceptInvite = (code, displayName) =>
  apiFetch(`/api/spelling/family/invites/${encodeURIComponent(code)}/accept`, {
    method: 'POST', body: displayName ? { display_name: displayName } : {}
  });

/** Everyone else who can see a child you added (or your own practice): [{ user_id, label, role, can_assign, can_view_reports }] */
export const getAccess = (learnerId) => apiFetch(`/api/spelling/family/learners/${encodeURIComponent(learnerId)}/access`);
export const removeAccess = (learnerId, userId) =>
  apiFetch(`/api/spelling/family/learners/${encodeURIComponent(learnerId)}/access/${encodeURIComponent(userId)}`, { method: 'DELETE' });

// ── Classes (F6) ──

export const getGroups = () => apiFetch('/api/spelling/groups');
export const createGroup = (name) => apiFetch('/api/spelling/groups', { method: 'POST', body: { name, consent: true } });
export const renameGroup = (id, name) => apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}`, { method: 'PUT', body: { name } });
export const deleteGroup = (id, deleteStudents) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}${deleteStudents ? '?delete_students=1' : ''}`, { method: 'DELETE' });
export const addStudents = (id, names, grade) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/students`, { method: 'POST', body: { names, ...(grade !== undefined ? { grade } : {}) } });
export const addGroupMember = (id, learnerId) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/members`, { method: 'POST', body: { learner_id: learnerId } });
export const removeGroupMember = (id, learnerId) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(learnerId)}`, { method: 'DELETE' });
export const setClassCode = (id, enabled) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/code`, { method: 'PUT', body: { enabled } });
/** { group, students: [{ id, display_name, avatar, grade, summary }], class_patterns: [{ pattern, label, students }], as_of } */
export const getClassOverview = (id) => apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/overview`);
export const assignToClass = (id, { list_id, due_at }) =>
  apiFetch(`/api/spelling/groups/${encodeURIComponent(id)}/assign`, { method: 'POST', body: { list_id, ...(due_at ? { due_at } : {}) } });
