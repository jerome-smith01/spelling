/**
 * Which learner is practicing on this device (family accounts).
 *
 *   { id: null }              -> the logged-in user themselves (the default; nothing changes)
 *   { id: '<uuid>', kid }     -> a child profile; `kid` = kid mode (adult screens locked)
 *
 * Kept outside React so non-React code (apiFetch, the attempt queue, the deck-progress
 * storage keys) can read it. The choice survives reloads in localStorage.
 */
const KEY = 'spelling_tutor_active_learner_v1';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v.id)) return { id: v.id, kid: v.kid === true };
  } catch {
    // storage unavailable or corrupt: act as the user
  }
  return { id: null, kid: false };
}

let current = load();
const listeners = new Set();

export const getActiveLearner = () => current;
export const getActiveLearnerId = () => current.id;

export function setActiveLearner({ id = null, kid = false } = {}) {
  const next = { id: id || null, kid: !!id && kid };
  if (next.id === current.id && next.kid === current.kid) return;
  current = next;
  try {
    if (next.id) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the choice lasts until the page closes
  }
  listeners.forEach(fn => fn(current));
}

export function subscribeActiveLearner(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Browser-storage key for per-learner data (deck progress, hiding state). The user's own key
 * is unchanged, so existing progress stays where it is; each child gets a separate copy.
 */
export function learnerKey(base, learnerId = current.id) {
  return learnerId ? `${base}:L${learnerId}` : base;
}
