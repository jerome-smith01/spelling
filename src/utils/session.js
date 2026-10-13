/**
 * One practice session: the words in a fixed (shuffled once) order. Dot N on screen is
 * the Nth card. Each card is 'ok' (100%), 'miss' (under 100%), 'skip', or untouched.
 * Missed and skipped cards are retried in place: the session loops back around to
 * the first card that isn't 'ok' yet, and ends when every card is 'ok'.
 */
import { shuffleQueue } from './schedule';

export const PASS_PCT = 100;

export function makeSession(words, random = Math.random) {
  return { order: shuffleQueue(words, null, random), status: {}, firstPct: {}, idx: 0, ended: false };
}

export const currentWord = (s) => (s.ended ? null : s.order[s.idx] ?? null);

export const isComplete = (s) => s.order.length > 0 && s.order.every(w => s.status[w] === 'ok');

/** Grade the current card: 100% = ok, anything lower = miss. */
export function recordResult(s, pct) {
  const w = s.order[s.idx];
  // The first try at a card is what the session grade counts
  const first = s.firstPct && w in s.firstPct ? s.firstPct : { ...s.firstPct, [w]: pct };
  return { ...s, firstPct: first, status: { ...s.status, [w]: pct >= PASS_PCT ? 'ok' : 'miss' } };
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
