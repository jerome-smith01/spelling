/**
 * Helpers for the Progress page.
 */
import { FLAME_THRESHOLD, MASTERY_STREAK } from './friction';

/** Percent of recorded answers that were correct (0 when there are none). */
export const wordAccuracy = (s) => (s.attempt_count > 0 ? Math.round((1 - s.error_count / s.attempt_count) * 100) : 0);

export const isMastered = (s) =>
  (s.perfect_streak ?? 0) >= MASTERY_STREAK || (!!s.mastered_at && s.friction_score === 0);

/**
 * Sort word scores into the three progress buckets:
 *   mastered      - 3 perfect sessions in a row
 *   struggling    - friction at or above the flame threshold (hardest first)
 *   needsPractice - some friction, not yet a flame (highest first)
 * Words with no friction that are not mastered yet are "steady": counted, not listed.
 */
export function bucketWords(scores) {
  const out = { mastered: [], struggling: [], needsPractice: [], steady: [] };
  for (const s of scores || []) {
    if (isMastered(s)) out.mastered.push(s);
    else if (s.friction_score >= FLAME_THRESHOLD) out.struggling.push(s);
    else if (s.friction_score > 0) out.needsPractice.push(s);
    else out.steady.push(s);
  }
  const byFriction = (a, b) => b.friction_score - a.friction_score || a.word.localeCompare(b.word);
  out.struggling.sort(byFriction);
  out.needsPractice.sort(byFriction);
  out.mastered.sort((a, b) => a.word.localeCompare(b.word));
  return out;
}

/** 'YYYY-MM-DD HH:MM:SS' (UTC, from SQLite) -> a local date string, or an em dash. */
export function formatSqlDate(value) {
  if (!value) return '—';
  const d = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** '2026-09-20' -> 'Sep 20' (no timezone shift). */
export function formatDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
