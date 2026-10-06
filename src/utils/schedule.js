/**
 * Progressive flashcard scheduling (pure functions, no storage or React).
 *
 * Levels: 1 = show 1 in 2 letters, 2 = 1 in 3, 3 = 1 in 4, 4 = all hidden.
 * Dates are local 'YYYY-MM-DD' strings so day math never shifts with timezones.
 */

export const LEVELS = [
  { level: 1, step: 2, label: '1 in 2 letters shown' },
  { level: 2, step: 3, label: '1 in 3 letters shown' },
  { level: 3, step: 4, label: '1 in 4 letters shown' },
  { level: 4, step: null, label: 'No letters shown' }
];
export const MAX_LEVEL = LEVELS.length;
export const DEFAULT_PREFS = { startLevel: 1, advancePct: 100, dropPct: 60 };
// Gap in days after passing level 1..3 when no test date is set
const NO_DATE_GAPS = [1, 2, 4];
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

/** Letter indices to hide for a level. Always hides at least one letter. */
export function hiddenIndicesForLevel(letterCount, level) {
  const step = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1].step;
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
  let i = a.length;
  let j = t.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === t[j - 1]) { matched[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const denom = Math.max(a.length, t.length);
  return { matched, pct: denom > 0 ? Math.round((dp[a.length][t.length] / denom) * 100) : 0 };
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
  const st = { ...cur, lastScore: pct, attempts: cur.attempts + 1 };
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

/** Quiz result: 100% tests the word out; anything else changes nothing. */
export function applyQuizResult(progress, word, pct, { prefs = DEFAULT_PREFS, today, testDate = null } = {}) {
  if (pct < 100) return { progress, testedOut: false };
  const cur = getWordState(progress, word, prefs, today);
  const last = lastPracticeDay(testDate);
  const st = {
    ...cur, level: MAX_LEVEL, mastered: true, lastScore: 100, attempts: cur.attempts + 1,
    due: last && last > today ? last : null
  };
  return { progress: { ...progress, words: { ...progress.words, [word]: st } }, testedOut: true };
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
