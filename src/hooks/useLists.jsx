import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useAuth } from './useAuth';
import {
  DEFAULT_LIST_ID,
  MAX_LISTS,
  loadLists,
  saveLists,
  newListId,
  sanitizeHints,
  visibleLists
} from '../services/storageService';
import { parseFocusGroups } from '../utils/smartHide';
import { syncLists, reconcile } from '../services/syncService';
import { flush as flushAttempts, queueLength, subscribe as subscribeQueue } from '../services/attemptQueue';
import { DEFAULT_RAW_WORDS } from '../utils/wordParser';

// syncStatus: 'idle' | 'syncing' | 'offline' | 'error' | 'partial'
const ListsContext = createContext(null);

const SYNC_INTERVAL_MS = 30000;
const DEBOUNCE_MS = 1500;

const DEFAULT_LIST = Object.freeze({
  id: DEFAULT_LIST_ID,
  name: '3rd-Grade Default',
  wordsRaw: DEFAULT_RAW_WORDS,
  isDefault: 0,
  updatedAt: new Date(0).toISOString(),
  dirty: false,
  deleted: false,
  focusGroups: [],
  hints: []
});

export function ListsProvider({ children }) {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;

  const [lists, setLists] = useState(loadLists);
  const listsRef = useRef(lists);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [firstSyncDone, setFirstSyncDone] = useState(false);
  const syncingRef = useRef(false);

  const commit = useCallback((next) => {
    listsRef.current = next;
    saveLists(next);
    setLists(next);
  }, []);

  // ── Mutations (always local-first; sync happens in the background) ──────────
  const stamp = () => new Date().toISOString();

  // `extra` carries optional list fields: { focusGroups, hints }
  const createList = useCallback((name, wordsRaw, extra = {}) => {
    const id = newListId();
    commit([
      ...listsRef.current,
      {
        id, name: name.trim() || 'Untitled list', wordsRaw, isDefault: 0, updatedAt: stamp(), dirty: true, deleted: false,
        focusGroups: parseFocusGroups(extra.focusGroups), hints: sanitizeHints(extra.hints)
      }
    ]);
    return id;
  }, [commit]);

  /** Save edited words. Editing the virtual default creates a real list; returns the list id. */
  const saveWords = useCallback((id, wordsRaw, extra) => {
    if (id === DEFAULT_LIST_ID) return createList('My Words', wordsRaw, extra);
    const fields = extra
      ? {
        ...(extra.focusGroups !== undefined ? { focusGroups: parseFocusGroups(extra.focusGroups) } : {}),
        ...(extra.hints !== undefined ? { hints: sanitizeHints(extra.hints) } : {})
      }
      : {};
    commit(listsRef.current.map(l => (l.id === id ? { ...l, wordsRaw, ...fields, updatedAt: stamp(), dirty: true } : l)));
    return id;
  }, [commit, createList]);

  const renameList = useCallback((id, name) => {
    const clean = name.trim();
    if (!clean) return;
    commit(listsRef.current.map(l => (l.id === id ? { ...l, name: clean.slice(0, 100), updatedAt: stamp(), dirty: true } : l)));
  }, [commit]);

  const deleteList = useCallback((id) => {
    commit(
      listsRef.current.flatMap(l => {
        if (l.id !== id) return [l];
        // Keep a tombstone only if it may exist remotely; otherwise just drop it
        return authRef.current.isLoggedIn || !l.dirty ? [{ ...l, deleted: true, updatedAt: stamp() }] : [];
      })
    );
  }, [commit]);

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !authRef.current.isLoggedIn) return;
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const snapshot = listsRef.current;
      const result = await syncLists(snapshot);
      commit(reconcile(listsRef.current, snapshot, result.merged, result.pushed, result.deleted));
      await flushAttempts();
      setSyncMessage(result.errors.length ? `${result.errors.length} list(s) could not be saved to your account.` : '');
      setSyncStatus(result.errors.length ? 'partial' : 'idle');
      setLastSyncedAt(new Date());
    } catch (err) {
      if (err.name === 'AuthError') {
        authRef.current.refresh(); // flips status to 'expired'; work stays local
        setSyncStatus('idle');
      } else if (err.name === 'NetworkError') {
        setSyncStatus('offline');
      } else {
        console.error('Sync failed', err);
        setSyncMessage(err.message || 'Sync failed');
        setSyncStatus('error');
      }
    } finally {
      syncingRef.current = false;
      setFirstSyncDone(true);
    }
  }, [commit]);

  // Sync when the user becomes authenticated (login, or returning with a session)
  useEffect(() => {
    if (auth.status === 'authenticated') syncNow();
    else if (auth.status !== 'loading') setFirstSyncDone(true);
  }, [auth.status, auth.user?.id, syncNow]);

  // Debounced sync after local edits
  useEffect(() => {
    if (auth.status !== 'authenticated' || !lists.some(l => l.dirty || l.deleted)) return undefined;
    const t = setTimeout(syncNow, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [lists, auth.status, syncNow]);

  // Retry: interval + back online + queued attempts + page hidden
  useEffect(() => {
    if (auth.status !== 'authenticated') return undefined;

    const pending = () => listsRef.current.some(l => l.dirty || l.deleted) || queueLength() > 0;
    const tick = () => { if (pending()) syncNow(); };
    const interval = setInterval(tick, SYNC_INTERVAL_MS);
    const onOnline = () => syncNow();
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && queueLength() > 0) {
        flushAttempts({ keepalive: true }).catch(() => {});
      }
    };
    let attemptTimer;
    const unsubscribe = subscribeQueue(() => {
      clearTimeout(attemptTimer);
      attemptTimer = setTimeout(() => flushAttempts().catch(() => {}), 3000);
    });

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      clearInterval(interval);
      clearTimeout(attemptTimer);
      unsubscribe();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [auth.status, syncNow]);

  const visible = useMemo(() => visibleLists(lists), [lists]);

  const getList = useCallback(
    (id) => (id === DEFAULT_LIST_ID ? DEFAULT_LIST : visible.find(l => l.id === id) ?? null),
    [visible]
  );

  // Deep links can only be resolved once we know whether the server has the list
  const ready = auth.status !== 'loading' && (auth.status !== 'authenticated' || firstSyncDone);

  const value = useMemo(
    () => ({
      lists: visible,
      defaultList: DEFAULT_LIST,
      getList,
      createList,
      saveWords,
      renameList,
      deleteList,
      syncNow,
      syncStatus,
      syncMessage,
      lastSyncedAt,
      ready,
      atListLimit: visible.length >= MAX_LISTS
    }),
    [visible, getList, createList, saveWords, renameList, deleteList, syncNow, syncStatus, syncMessage, lastSyncedAt, ready]
  );

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) throw new Error('useLists must be used inside <ListsProvider>');
  return ctx;
}
