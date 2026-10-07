/** Pattern progress table helpers (smart hiding, Phase 4). Pure functions. */

export const SORTS = [
  { id: 'least-practiced', label: 'Least practiced' },
  { id: 'least-known', label: 'Least known' },
  { id: 'recent', label: 'Most recent' }
];
export const DEFAULT_SORT = 'least-known';
const sortKey = (userId) => `spelling_tutor_pattern_sort_v1:${userId || 'anon'}`;

export function loadSort(userId) {
  try {
    const v = localStorage.getItem(sortKey(userId));
    return SORTS.some(s => s.id === v) ? v : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

export function saveSort(userId, id) {
  try {
    localStorage.setItem(sortKey(userId), id);
  } catch {
    // storage unavailable: the choice lasts for this visit only
  }
}

/** Accuracy (0-100 or null) bucketed to a Harvey ball: 0/25/50/75/100 -> 0..4 quarters. */
export const accuracyQuarters = (acc) => (acc == null ? 0 : Math.max(0, Math.min(4, Math.round(acc / 25))));

const acc = (p) => (p.accuracy ?? (p.attempts > 0 ? Math.round(((p.attempts - p.misses) / p.attempts) * 100) : 0));

export function sortPatterns(patterns, sort) {
  const rows = [...(patterns || [])];
  const byLabel = (a, b) => String(a.label).localeCompare(String(b.label));
  if (sort === 'least-practiced') rows.sort((a, b) => (a.attempts ?? 0) - (b.attempts ?? 0) || byLabel(a, b));
  else if (sort === 'recent') rows.sort((a, b) => String(b.last_practiced || '').localeCompare(String(a.last_practiced || '')) || byLabel(a, b));
  else rows.sort((a, b) => acc(a) - acc(b) || byLabel(a, b));
  return rows;
}
