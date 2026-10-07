import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { loadTutorial, saveTutorial } from '../services/tutorialStorage';

const MAX_STEPS_PER_VISIT = 3;
const noop = () => {};
// No provider (e.g. isolated component tests): tutorials are simply off
const OFF = {
  isActive: false, steps: null, index: 0, step: null, tutorialKey: null, decided: true, enabled: false,
  checkAndStart: async () => false, start: noop, advance: noop, back: noop, skip: noop, cancel: noop,
  restart: noop, decide: noop, enableAll: noop
};
const TutorialContext = createContext(OFF);
export const useTutorial = () => useContext(TutorialContext);

/**
 * Global tutorial controller (React port of the Bible app's TutorialController).
 * - checkAndStart: queue at most 3 unseen steps per screen visit
 * - advance: marks the current step seen, moves on / finishes
 * - skip: marks every step on the screen seen
 * - cancel: closes without marking anything seen (offered again next visit)
 */
export function TutorialProvider({ children }) {
  const [store, setStore] = useState(loadTutorial);
  const [run, setRunState] = useState(null); // { key, steps, all, index }
  const runRef = useRef(null);
  const setRun = useCallback((r) => { runRef.current = r; setRunState(r); }, []);
  const storeRef = useRef(store);
  storeRef.current = store;

  const update = useCallback((patch) => {
    const next = typeof patch === 'function' ? patch(storeRef.current) : { ...storeRef.current, ...patch };
    storeRef.current = next;
    saveTutorial(next);
    setStore(next);
  }, []);

  const markSeen = useCallback((keys) => {
    update(s => ({ ...s, completed: { ...s.completed, ...Object.fromEntries(keys.map(k => [k, true])) } }));
  }, [update]);

  const start = useCallback((key, steps, all = steps) => {
    if (steps.length) setRun({ key, steps, all, index: 0 });
  }, [setRun]);

  const checkAndStart = useCallback(async (key, allSteps, { onBeforeStart, isAvailable = () => true } = {}) => {
    const s = storeRef.current;
    if (!s.decided || !s.enabled) return false;
    const unseen = allSteps.filter(st => !s.completed[st.stepKey] && isAvailable(st));
    if (!unseen.length) return false;
    if (onBeforeStart) await onBeforeStart();
    start(key, unseen.slice(0, MAX_STEPS_PER_VISIT), allSteps);
    return true;
  }, [start]);

  const advance = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    markSeen([r.steps[r.index].stepKey]);
    setRun(r.index < r.steps.length - 1 ? { ...r, index: r.index + 1 } : null);
  }, [markSeen, setRun]);

  const back = useCallback(() => {
    const r = runRef.current;
    if (r && r.index > 0) setRun({ ...r, index: r.index - 1 });
  }, [setRun]);
  const cancel = useCallback(() => setRun(null), [setRun]);
  const skip = useCallback(() => {
    const r = runRef.current;
    if (r) markSeen(r.all.map(st => st.stepKey));
    setRun(null);
  }, [markSeen, setRun]);

  /** Clear this screen's seen flags and run it again (also re-enables tutorials). */
  const restart = useCallback((key, allSteps, opts = {}) => {
    update(s => {
      const completed = { ...s.completed };
      allSteps.forEach(st => delete completed[st.stepKey]);
      return { ...s, decided: true, enabled: true, completed };
    });
    return checkAndStart(key, allSteps, opts);
  }, [update, checkAndStart]);

  const decide = useCallback((enabled) => update(s => ({ ...s, decided: true, enabled })), [update]);
  const enableAll = useCallback(() => update(s => ({ ...s, decided: true, enabled: true, completed: {} })), [update]);

  const value = useMemo(() => ({
    isActive: !!run, steps: run?.steps || null, index: run?.index || 0,
    step: run ? run.steps[run.index] : null, tutorialKey: run?.key || null,
    decided: store.decided, enabled: store.enabled,
    checkAndStart, start, advance, back, skip, cancel, restart, decide, enableAll
  }), [run, store.decided, store.enabled, checkAndStart, start, advance, back, skip, cancel, restart, decide, enableAll]);

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}
