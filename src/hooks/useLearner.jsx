import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { getFamily, verifyPin as apiVerifyPin } from '../services/familyApi';
import {
  getActiveLearner, setActiveLearner as storeActiveLearner, subscribeActiveLearner
} from '../services/activeLearner';

/**
 * Family accounts: who is practising on this device, and the kid-mode lock.
 *
 *  - `learners`     the learners this user can act for (themselves first, then children)
 *  - `activeLearner` the one practising now (the user themselves unless a child is chosen)
 *  - `kidMode`      a child is practising and the adult screens are locked
 *  - `switchTo(id)` practise as a child, in kid mode (id null = back to the user, needs the PIN if kid mode is on)
 *  - `unlock(pin)`  leave kid mode; resolves true on success
 *
 * The PIN is a soft lock for a child on a parent's device. The server checks it, but kid mode
 * itself is enforced in the app, so it is not account security.
 */
const LearnerContext = createContext(null);
const CACHE_KEY = 'spelling_tutor_family_v1';

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (v && Array.isArray(v.learners)) return v;
  } catch { /* storage unavailable or corrupt */ }
  return null;
}
function writeCache(v) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

// Without a provider (isolated component tests) behave like a user with no children
const NO_FAMILY = Object.freeze({
  learners: [], activeLearner: null, activeId: null, kidMode: false, pinSet: false, loaded: true,
  maxChildren: 8, avatars: [],
  refresh: async () => {}, switchTo: async () => true, unlock: async () => true
});

export function LearnerProvider({ children }) {
  const { status } = useAuth();
  const [active, setActive] = useState(getActiveLearner);
  const [family, setFamily] = useState(() => readCache() || { learners: [], pin_set: false, max_children: 8, avatars: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => subscribeActiveLearner(setActive), []);

  const refresh = useCallback(async () => {
    try {
      const data = await getFamily();
      const next = {
        learners: data.learners || [], pin_set: !!data.pin_set,
        max_children: data.max_children || 8, avatars: data.avatars || []
      };
      setFamily(next);
      writeCache(next);
      // The chosen child was deleted (or unlinked) elsewhere: go back to the user
      const cur = getActiveLearner();
      if (cur.id && !next.learners.some(l => l.id === cur.id)) storeActiveLearner({ id: null });
    } catch {
      // Offline or signed out: keep the cached list so a child can still practise
    } finally {
      setLoaded(true);
    }
  }, []);

  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (status === 'authenticated') refresh();
    else if (status === 'anonymous' && was === 'authenticated') {
      // An explicit log out: forget the children on this device
      storeActiveLearner({ id: null });
      setFamily({ learners: [], pin_set: false, max_children: 8, avatars: [] });
      writeCache({ learners: [], pin_set: false, max_children: 8, avatars: [] });
      setLoaded(true);
    } else {
      // Loading, expired, or anonymous because the app launched offline: keep the cached family and the
      // chosen child, so a child can keep practising offline (their attempts stay queued for them)
      setLoaded(true);
    }
  }, [status, refresh]);

  const activeLearner = useMemo(
    () => (active.id ? family.learners.find(l => l.id === active.id) || null : null),
    [active.id, family.learners]
  );

  const switchTo = useCallback(async (id, { kid = true } = {}) => {
    storeActiveLearner({ id, kid });
    return true;
  }, []);

  const unlock = useCallback(async (pin) => {
    if (family.pin_set) await apiVerifyPin(pin); // rejects on a wrong PIN
    storeActiveLearner({ id: getActiveLearner().id, kid: false });
    return true;
  }, [family.pin_set]);

  const value = useMemo(() => ({
    learners: family.learners,
    activeLearner,
    activeId: active.id,
    kidMode: !!active.id && active.kid,
    pinSet: family.pin_set,
    maxChildren: family.max_children,
    avatars: family.avatars,
    loaded,
    refresh,
    switchTo,
    unlock
  }), [family, activeLearner, active, loaded, refresh, switchTo, unlock]);

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner() {
  return useContext(LearnerContext) || NO_FAMILY;
}

/** Children a grown-up can practise as: child profiles they own, or are a guardian of. */
export const childrenOf = (learners) =>
  learners.filter(l => l.kind === 'managed' && (l.role === 'owner' || l.role === 'guardian'));

/** Everyone this account follows besides themselves: their children, shared children and linked students. */
export const followedOf = (learners) => learners.filter(l => l.role !== 'self');

/** The people shown as cards on the Family page: everyone followed except students who are in one of your classes. */
export const familyCardsOf = (learners) => learners.filter(l => l.role !== 'self' && !(l.group_ids && l.group_ids.length > 0));

/** Child profiles this account added (counted against the limit). */
export const ownedChildrenOf = (learners) => learners.filter(l => l.kind === 'managed' && l.role === 'owner');
