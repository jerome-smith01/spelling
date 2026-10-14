/**
 * One practice session: the words in a fixed (shuffled once) order. Dot N on screen is
 * the Nth card. Each card is 'ok' (100%), 'miss' (under 100%), 'skip', or untouched.
 * Missed and skipped cards are retried in place: the session loops back around to
 * the first card that isn't 'ok' yet, and ends when every card is 'ok'.
 *
 * Focus retries: when the same letter of a word is missed twice in a session, the next
 * try hides only those letters ('focus'). Getting them right brings the word back once
 * more at its normal level ('confirm'); passing that finishes the card as `assisted`.
 */
import { shuffleQueue } from './schedule';

export const PASS_PCT = 100;
export const FOCUS_AFTER_MISSES = 2;

export function makeSession(words, random = Math.random) {
  return {
    order: shuffleQueue(words, null, random), status: {}, firstPct: {}, idx: 0, ended: false,
    misses: {}, focus: {}, assisted: {}
  };
}

export const currentWord = (s) => (s.ended ? null : s.order[s.idx] ?? null);

export const isComplete = (s) => s.order.length > 0 && s.order.every(w => s.status[w] === 'ok');

/** The word's focus retry ({ phase: 'focus' | 'confirm', positions }) or null. */
export const focusFor = (s, word) => s.focus?.[word] ?? null;

/**
 * Grade the current card: 100% = ok, anything lower = miss. `missed` lists the letter
 * positions wrong on this try; a position missed twice in the session starts a focus retry.
 */
export function recordResult(s, pct, missed = []) {
  const w = s.order[s.idx];
  // The first try at a card is what the session grade counts
  const first = s.firstPct && w in s.firstPct ? s.firstPct : { ...s.firstPct, [w]: pct };
  const counts = { ...s.misses?.[w] };
  for (const i of missed) counts[i] = (counts[i] || 0) + 1;
  const focus = { ...s.focus };
  const assisted = { ...s.assisted };
  const cur = focus[w];
  const passed = pct >= PASS_PCT;
  let status = passed ? 'ok' : 'miss';

  if (cur?.phase === 'focus') {
    // Tricky letters right: one more go at the normal level before the card is done
    if (passed) focus[w] = { ...cur, phase: 'confirm' };
    status = 'miss';
  } else if (passed) {
    if (cur) { assisted[w] = true; delete focus[w]; }
  } else {
    const repeated = missed.filter(i => counts[i] >= FOCUS_AFTER_MISSES).sort((a, b) => a - b);
    if (repeated.length) focus[w] = { phase: 'focus', positions: repeated };
  }

  return {
    ...s, firstPct: first, misses: { ...s.misses, [w]: counts }, focus, assisted,
    status: { ...s.status, [w]: status }
  };
}

/** End-of-session grade: the average first-try score over the cards attempted, or null if none. */
export function sessionGrade(s) {
  const scores = Object.values(s.firstPct || {});
  if (!scores.length) return null;
  const pct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  return { pct, letter, cards: scores.length, perfect: scores.filter(p => p >= PASS_PCT).length };
}

/** Mark the current card skipped, unless it is already ok (a retried finished card stays ok). */
export function recordSkip(s) {
  const w = s.order[s.idx];
  return s.status[w] === 'ok' ? s : { ...s, status: { ...s.status, [w]: 'skip' } };
}

/** Move to the next card (looping past the end) that isn't ok yet; ends the session if none is left. */
export function advance(s) {
  const n = s.order.length;
  for (let step = 1; step <= n; step++) {
    const i = (s.idx + step) % n;
    if (s.status[s.order[i]] !== 'ok') return { ...s, idx: i };
  }
  return { ...s, ended: true };
}

export const goTo = (s, i) => (i >= 0 && i < s.order.length ? { ...s, idx: i, ended: false } : s);

export const endEarly = (s) => ({ ...s, ended: true });
