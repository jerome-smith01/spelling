/**
 * Progressive flashcard scheduling (pure functions, no storage or React).
 *
 * Levels: 1 = pick the missing letters from choices, 2 = 1 in 2 letters visible, 3 = 1 in 3,
 * 4 = 1 in 4, 5 = quiz from audio (nothing shown; the last level, passing it masters the word).
 * Saved progress from the earlier ladder (1 in 2 ... 1 in 5, none) moves up one level (see migrateProgress).
 * Dates are local 'YYYY-MM-DD' strings so day math never shifts with timezones.
 */
import { smartHiddenIndices } from './smartHide';

export const LEVELS = [
  { level: 1, step: 2, kind: 'pick', label: 'Select the missing letters' },
  { level: 2, step: 2, label: '1 in 2 letters visible' },
  { level: 3, step: 3, label: '1 in 3 letters visible' },
  { level: 4, step: 4, label: '1 in 4 letters visible' },
  { level: 5, step: null, kind: 'quiz', label: 'Quiz from audio' }
];
export const MAX_LEVEL = LEVELS.length;
// Most recent graded attempts kept per word (for the card's Progress bars)
export const HISTORY_LIMIT = 10;
export const LEVEL_SCHEME = 2; // 1 = the old ladder (1 in 2 ... none); 2 = pick, 1 in 2/3/4, audio quiz
export const DEFAULT_PREFS = { startLevel: 1, advancePct: 100, dropPct: 60, autoSpeak: true, levelScheme: LEVEL_SCHEME };

// Old level n is new level n + 1; the old "no letters" level (5) stays the last one
const shiftLevel = (lv) => Math.min(5, Math.max(1, Math.round(Number(lv) || 1)) + 1);

/** Saved deck progress from the old ladder, moved up one level. Anything already migrated is returned as is. */
export function migrateProgress(progress) {
  if (!progress || progress.levelScheme === LEVEL_SCHEME) return progress;
  const words = {};
  for (const [w, st] of Object.entries(progress.words || {})) {
    words[w] = {
      ...st,
      level: shiftLevel(st.level),
      ...(st.history ? { history: st.history.map(h => ({ ...h, level: shiftLevel(h.level) })) } : {})
    };
  }
  return { ...progress, words, levelScheme: LEVEL_SCHEME };
}

/** Saved prefs from the old ladder: the starting level moves up one too. */
export function migratePrefs(prefs) {
  if (!prefs || prefs.levelScheme === LEVEL_SCHEME) return prefs;
  return { ...prefs, startLevel: shiftLevel(prefs.startLevel), levelScheme: LEVEL_SCHEME };
}
// Gap in days after passing level 1..4 when no test date is set
const NO_DATE_GAPS = [1, 2, 4, 7];
const REQUEUE_AFTER = 3;

const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

/**
 * Letter indices to hide for a level. Always hides at least one letter.
 * With `smart.groups` (a list's focus letters) the lesson's letters are hidden instead
 * (see smartHide.js); a word without any of them falls back to 1-in-N hiding.
 */
export function hiddenIndicesForLevel(letterCount, level, smart = null) {
  if (smart?.groups?.length) {
    const s = smartHiddenIndices(smart.word, Math.min(Math.max(level, 1), MAX_LEVEL), smart.groups, smart.struggle);
    if (s) return s;
  }
  const { step } = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
  const hidden = new Set();
  for (let i = 0; i < letterCount; i++) {
    if (step === null || i % step !== 0) hidden.add(i);
  }
  if (hidden.size === 0 && letterCount > 0) hidden.add(letterCount - 1);
  return hidden;
}

/** Percent (0-100, integer) of `total` letters that are `correct`. */
export const accuracyPct = (correct, total) => (total > 0 ? Math.round((correct / total) * 100) : 0);

/** 'advance' | 'stay' | 'drop' for an accuracy percentage. */
export function outcomeFor(pct, prefs = DEFAULT_PREFS) {
  if (pct >= prefs.advancePct) return 'advance';
  if (pct < prefs.dropPct) return 'drop';
  return 'stay';
}

/**
 * Align typed text to the answer (LCS). Returns which answer letters were matched
 * and a score = matched / max(answer length, typed length), so extra letters cost too.
 */
export function alignSpelling(typed, answer) {
  const t = (typed || '').trim().toLowerCase();
  const a = answer.toLowerCase();
  const dp = Array.from({ length: a.length + 1 }, () => new Array(t.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = a[i - 1] === t[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matched = new Array(a.length).fill(false);
  const typedMatched = new Array(t.length).fill(false);
  let i = a.length;
  let j = t.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === t[j - 1]) { matched[i - 1] = true; typedMatched[j - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const denom = Math.max(a.length, t.length);
  return { matched, typedMatched, pct: denom > 0 ? Math.round((dp[a.length][t.length] / denom) * 100) : 0 };
}

/**
 * The student's spelling lined up against the answer, in reading order: each cell is a typed
 * letter that is right ('ok') or wrong/extra ('extra'), or a letter they left out ('missing').
 */
export function alignCells(typed, answer) {
  const t = (typed || '').trim();
  const a = answer;
  const tl = t.toLowerCase();
  const al = a.toLowerCase();
  // Edit distance, so a wrong letter counts as a swap for the letter it replaced
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: t.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + (al[i - 1] === tl[j - 1] ? 0 : 1),
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1
      );
    }
  }
  const cells = [];
  let i = a.length;
  let j = t.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && al[i - 1] === tl[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { cells.push({ ch: t[j - 1], kind: 'ok' }); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { cells.push({ ch: a[i - 1], kind: 'missing' }); i--; }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { cells.push({ ch: t[j - 1], kind: 'extra' }); i--; j--; }
    else { cells.push({ ch: t[j - 1], kind: 'extra' }); j--; }
  }
  return cells.reverse();
}

/**
 * A word's recent form: the average of its last `n` attempts (earlier practice history plus
 * the attempt just made), as a whole percent.
 */
export function recentPct(history = [], latest, n = 5) {
  const scores = [...history.map(h => h.pct), latest].filter(p => typeof p === 'number').slice(-n);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

/** Last day a word can be practiced (the day before the test), or null with no test date. */
export const lastPracticeDay = (testDate) => (testDate ? addDays(testDate, -1) : null);

/** Practice days left, counting today (0 once the test day arrives). */
export const daysLeft = (today, testDate) => (testDate ? Math.max(0, daysBetween(today, testDate)) : null);

const newWordState = (prefs, today) => ({
  level: prefs.startLevel, mastered: false, due: today, lastScore: null, advancedOn: null, attempts: 0
});

export const getWordState = (progress, word, prefs, today) =>
  progress.words[word] || newWordState(prefs, today);

/** Days until the word's next showing after a pass at `level`; 0 means "again this session". */
export function gapAfterPass(level, today, testDate) {
  if (!testDate) return NO_DATE_GAPS[Math.min(level, NO_DATE_GAPS.length) - 1];
  const left = daysLeft(today, testDate);
  const passesAfter = MAX_LEVEL - level;
  if (left - 1 < passesAfter) return 0; // crunch: not enough days left to space it out
  return Math.max(1, Math.floor(left / (passesAfter + 1)));
}

function scheduleDue(today, gap, testDate) {
  const last = lastPracticeDay(testDate);
  const due = addDays(today, gap);
  return last && due > last ? (last < today ? today : last) : due;
}

/**
 * Apply one graded attempt. Returns { progress, requeue, outcome, next } where
 * `requeue` says the word stays in today's session queue and `next` describes
 * what happens to it (for the card back).
 */
export function applyResult(progress, word, pct, { prefs = DEFAULT_PREFS, today, testDate = null } = {}) {
  const cur = getWordState(progress, word, prefs, today);
  const outcome = outcomeFor(pct, prefs);
  const st = {
    ...cur, lastScore: pct, attempts: cur.attempts + 1, reviewedOn: today,
    history: [...(cur.history || []), { pct, level: cur.level }].slice(-HISTORY_LIMIT)
  };
  let requeue = false;
  let next;

  if (outcome === 'drop') {
    st.level = Math.max(1, cur.level - 1);
    st.mastered = false;
    st.due = today;
    requeue = true;
    next = { kind: cur.level === 1 ? 'stay' : 'drop', level: st.level };
  } else if (outcome === 'stay') {
    st.due = today;
    requeue = true;
    next = { kind: 'stay', level: st.level };
  } else if (cur.level >= MAX_LEVEL) {
    st.mastered = true;
    const last = lastPracticeDay(testDate);
    st.due = last && last > today ? last : null;
    next = { kind: 'mastered', due: st.due };
  } else {
    const gap = gapAfterPass(cur.level, today, testDate);
    const canAdvance = cur.advancedOn !== today || gap === 0;
    st.level = canAdvance ? cur.level + 1 : cur.level;
    if (canAdvance) st.advancedOn = today;
    if (gap === 0 && canAdvance) {
      st.due = today;
      requeue = true;
      next = { kind: 'again-today', level: st.level };
    } else {
      st.due = scheduleDue(today, Math.max(gap, 1), testDate);
      next = { kind: 'advance', level: st.level, due: st.due };
    }
  }

  return { progress: { ...progress, words: { ...progress.words, [word]: st } }, requeue, outcome, next };
}

/**
 * Quiz result: 100% tests the word out. A miss on an already-learned word un-learns it
 * (the latest attempt decides): back down a level and due today. Other misses change nothing.
 */
export function applyQuizResult(progress, word, pct, { prefs = DEFAULT_PREFS, today, testDate = null } = {}) {
  const cur = getWordState(progress, word, prefs, today);
  if (pct < 100) {
    if (!cur.mastered) return { progress, testedOut: false };
    const st = { ...cur, mastered: false, level: Math.max(1, cur.level - 1), due: today, lastScore: pct, attempts: cur.attempts + 1, reviewedOn: today };
    return { progress: { ...progress, words: { ...progress.words, [word]: st } }, testedOut: false, unlearned: true };
  }
  const last = lastPracticeDay(testDate);
  const st = {
    ...cur, level: MAX_LEVEL, mastered: true, lastScore: 100, attempts: cur.attempts + 1, reviewedOn: today,
    due: last && last > today ? last : null
  };
  return { progress: { ...progress, words: { ...progress.words, [word]: st } }, testedOut: true };
}

/**
 * Each word's stage as the server stores it for an assigned list: { word: { level, mastered } }.
 * Only words that have been practiced have a stage.
 */
export function stagesOf(progress) {
  const out = {};
  for (const [word, st] of Object.entries(progress.words || {})) {
    out[word] = { level: Math.max(1, Math.min(MAX_LEVEL, st.level || 1)), mastered: !!st.mastered };
  }
  return out;
}

/**
 * Carry on from stages stored on the server (another device): a word this device has never practiced starts
 * where the server has it. A word this device already has keeps its own stage, which may be lower than the
 * server's (progress can go down, and the device that last practiced is the one that counts).
 * Returns the same object when nothing changed.
 */
export function seedRemoteStages(progress, remote, { prefs = DEFAULT_PREFS, today } = {}) {
  let words = progress.words;
  for (const [word, r] of Object.entries(remote || {})) {
    if (!r || typeof r.level !== 'number' || words[word]) continue;
    const base = getWordState({ words }, word, prefs, today);
    const level = Math.max(1, Math.min(MAX_LEVEL, Math.round(r.level)));
    words = { ...words, [word]: r.mastered ? { ...base, level: MAX_LEVEL, mastered: true, due: null } : { ...base, level, due: today } };
  }
  return words === progress.words ? progress : { ...progress, words };
}

/** Is the word due for practice today? Mastered words only return for their final check. */
export function isDue(state, today) {
  if (!state) return true; // never seen
  return state.due !== null && state.due <= today;
}

/** Ordered word texts for today's session: struggling first, then due by date, then unseen. */
export function buildQueue(wordTexts, progress, today, prefs = DEFAULT_PREFS) {
  const rows = wordTexts.map((w, i) => ({ w, i, st: progress.words[w] }));
  const rank = (r) => {
    if (!r.st) return 2;
    return r.st.lastScore !== null && r.st.lastScore < prefs.dropPct ? 0 : 1;
  };
  return rows
    .filter(r => isDue(r.st, today))
    .sort((a, b) => rank(a) - rank(b) || (a.st?.due || '').localeCompare(b.st?.due || '') || a.i - b.i)
    .map(r => r.w);
}

/** Move the front word to ~3 cards later (or the end of a short queue). */
export function requeueFront(queue) {
  if (queue.length <= 1) return queue;
  const [first, ...rest] = queue;
  const at = Math.min(REQUEUE_AFTER, rest.length);
  return [...rest.slice(0, at), first, ...rest.slice(at)];
}

/**
 * Random order for the next turn. When `avoid` (the card just answered) is still in the
 * queue and others exist, it never lands first, so a missed word can't repeat back-to-back.
 */
export function shuffleQueue(queue, avoid = null, random = Math.random) {
  const a = [...queue];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoid !== null && a.length > 1 && a[0] === avoid) {
    const k = 1 + Math.floor(random() * (a.length - 1));
    [a[0], a[k]] = [a[k], a[0]];
  }
  return a;
}
