import { alignCells } from './schedule';

/**
 * The row the review popup works on: one cell per letter of the child's spelling.
 *   { ch, ok }               a right letter
 *   { ch, ok: false, fix }   a wrong letter (ch may be '' for a left-out one); `fix` is what belongs there
 *   { ch, ok: false, fix: null }  a surplus letter with nothing to replace
 */
export function cellsFromSpelling(typed, answer) {
  return alignCells(typed, answer).map(c => (c.kind === 'ok'
    ? { ch: c.ch, ok: true }
    : { ch: c.kind === 'missing' ? '' : c.ch, ok: false, fix: c.ans ?? null }));
}

/** Practice: the word's letters, with the child's own letters at the positions they got wrong. */
export function cellsFromPractice(word, typed, wrong) {
  const bad = new Set(wrong);
  return word.split('').map((ch, i) => (bad.has(i)
    ? { ch: (typed?.[i] || '').toLowerCase(), ok: false, fix: ch }
    : { ch, ok: true }));
}
