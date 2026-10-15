import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DEFAULT_PREFS, applyResult, applyQuizResult, buildQueue, shuffleQueue, toDateStr, getWordState, seedRemoteStages
} from '../utils/schedule';
import { learnerKey } from '../services/activeLearner';

// Per learner: a child's progress and settings are kept apart from the parent's and siblings'
const prefsKey = () => learnerKey('spelling_tutor_deck_prefs_v1');
const progressKey = (listId) => learnerKey(`spelling_tutor_deck_progress_v1:${listId}`);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the app keeps working in memory
  }
}

/** Today as a local date string. `?today=YYYY-MM-DD` overrides it so schedules can be tested. */
function currentDay() {
  try {
    const o = new URLSearchParams(window.location.search).get('today');
    if (o && DATE_RE.test(o)) return o;
  } catch {
    // ignore
  }
  return toDateStr(new Date());
}

/** Read-only snapshot of a deck's progress for the dashboard (no hook state needed). */
export function loadDeckSummary(listId, wordTexts) {
  const prefs = read(prefsKey(), { ...DEFAULT_PREFS, view: 'deck' });
  const progress = read(progressKey(listId), { testDate: null, words: {} });
  return {
    total: wordTexts.length,
    learned: wordTexts.filter(w => progress.words[w]?.mastered).length,
    due: buildQueue(wordTexts, progress, currentDay(), prefs).length,
    // words whose latest score fell below the drop threshold = how hard the deck is right now
    struggling: wordTexts.filter(w => {
      const st = progress.words[w];
      return st && st.lastScore !== null && st.lastScore !== undefined && st.lastScore < prefs.dropPct;
    }).length,
    lastReviewed: wordTexts.map(w => progress.words[w]?.reviewedOn || '').sort().pop() || ''
  };
}

/**
 * Per-list deck progress + today's session queue.
 * Prefs (view, start level, thresholds) are shared across lists; test date and
 * per-word progress are per list.
 *
 * `strict` (a list assigned to this learner): a stage is only passed at 100%, whatever the
 * saved threshold says, so "done" means the same for everyone.
 */
export function useDeckSchedule(listId, wordTexts, { strict = false } = {}) {
  const today = useMemo(currentDay, []);
  const [savedPrefs, setPrefsState] = useState(() => read(prefsKey(), { ...DEFAULT_PREFS, view: 'deck' }));
  const prefs = useMemo(() => (strict ? { ...savedPrefs, advancePct: 100 } : savedPrefs), [savedPrefs, strict]);
  const [progress, setProgress] = useState(() => read(progressKey(listId), { testDate: null, words: {} }));
  const wordsKey = wordTexts.join('|');
  const [queue, setQueue] = useState(() => buildQueue(wordTexts, progress, today, prefs));
  // Latest progress for synchronous reads inside callbacks
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => write(prefsKey(), savedPrefs), [savedPrefs]);
  useEffect(() => write(progressKey(listId), progress), [listId, progress]);

  // A new/edited word list starts a fresh queue
  useEffect(() => {
    setQueue(buildQueue(wordTexts, progressRef.current, today, prefs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey]);

  const setPrefs = useCallback((patch) => setPrefsState(p => ({ ...p, ...patch })), []);

  const setTestDate = useCallback((date) => {
    setProgress(p => ({ ...p, testDate: date && DATE_RE.test(date) ? date : null }));
  }, []);

  const ctx = () => ({ prefs, today, testDate: progressRef.current.testDate });

  /** Grade a practice attempt. Queue is untouched until `advance` so the card back stays put. */
  const commit = useCallback((word, pct) => {
    const result = applyResult(progressRef.current, word, pct, ctx());
    progressRef.current = result.progress;
    setProgress(result.progress);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, today]);

  // Every turn draws from a freshly shuffled queue; a requeued word stays in it
  const advance = useCallback((requeue) => {
    setQueue(q => {
      const answered = q[0];
      return shuffleQueue(requeue ? q : q.slice(1), requeue ? answered : null);
    });
  }, []);

  /** Start words this device has not practiced where the server has them (another device); never changes a word already here. */
  const mergeRemote = useCallback((remote) => {
    const next = seedRemoteStages(progressRef.current, remote, { prefs, today });
    if (next === progressRef.current) return false;
    progressRef.current = next;
    setProgress(next);
    setQueue(buildQueue(wordTexts, next, today, prefs));
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, today, prefs]);

  /** Practice any word right now (extra practice), ahead of the rest of the queue. */
  const jumpTo = useCallback((word) => {
    setQueue(q => [word, ...q.filter(w => w !== word)]);
  }, []);

  /** Nothing left due: keep going through every word that isn't learned (or all if none). */
  const practiceAnyway = useCallback(() => {
    const p = progressRef.current;
    const open = wordTexts.filter(w => !p.words[w]?.mastered);
    setQueue(open.length ? open : [...wordTexts]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey]);

  const commitQuiz = useCallback((word, pct) => {
    const result = applyQuizResult(progressRef.current, word, pct, ctx());
    if (result.testedOut || result.unlearned) {
      progressRef.current = result.progress;
      setProgress(result.progress);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, today]);

  /** Rebuild today's queue from current progress (after a quiz, or when settings change). */
  const refreshQueue = useCallback(() => {
    setQueue(buildQueue(wordTexts, progressRef.current, today, prefs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, today, prefs]);

  const resetProgress = useCallback(() => {
    const fresh = { testDate: progressRef.current.testDate, words: {} };
    progressRef.current = fresh;
    setProgress(fresh);
    setQueue(buildQueue(wordTexts, fresh, today, prefs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, today, prefs]);

  const stateFor = useCallback((word) => getWordState(progress, word, prefs, today), [progress, prefs, today]);
  const dueCount = useMemo(
    () => buildQueue(wordTexts, progress, today, prefs).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wordsKey, progress, today, prefs]
  );

  return {
    prefs, setPrefs, today, testDate: progress.testDate, setTestDate,
    progress, stateFor, queue, dueCount,
    commit, advance, jumpTo, practiceAnyway, commitQuiz, refreshQueue, resetProgress, mergeRemote
  };
}
