/**
 * Smart hiding (pure functions): hide the letters a lesson is about.
 *
 * A list's "focus letters" (e.g. ou, ow, oi, oy) are the target groups. Levels reuse
 * the deck's 4-level ladder; only *which* letters hide changes:
 *   L1  target letters hidden, answered by multiple choice from the lesson's groups
 *   L2  target letters hidden, typed
 *   L3  target letters + every other letter from the 2nd (or the learner's struggle letters)
 *   L4  all letters hidden
 */

export const MAX_FOCUS_GROUPS = 12;
const GROUP_RE = /^[a-z]{1,4}$/;

/** "ou, ow / oi oy" -> ['ou', 'ow', 'oi', 'oy'] (lowercase letters only, de-duplicated). */
export function parseFocusGroups(input) {
  const parts = Array.isArray(input) ? input : String(input || '').split(/[\s,;/|]+/);
  const out = [];
  for (const p of parts) {
    const g = String(p).trim().toLowerCase();
    if (GROUP_RE.test(g) && !out.includes(g)) out.push(g);
    if (out.length >= MAX_FOCUS_GROUPS) break;
  }
  return out;
}

/**
 * Target groups found in the word, left to right. At each position the longest
 * matching group wins, so `ow` in "shower" is one unit; matches never overlap.
 * Returns [{ group, start, end }] with `end` exclusive.
 */
export function findTargets(word, groups) {
  const w = String(word || '').toLowerCase();
  const sorted = [...parseFocusGroups(groups)].sort((a, b) => b.length - a.length);
  const out = [];
  for (let i = 0; i < w.length;) {
    const g = sorted.find(x => w.startsWith(x, i));
    if (g) {
      out.push({ group: g, start: i, end: i + g.length });
      i += g.length;
    } else {
      i++;
    }
  }
  return out;
}

const targetIndexSet = (targets) => {
  const s = new Set();
  for (const t of targets) for (let i = t.start; i < t.end; i++) s.add(i);
  return s;
};

/**
 * Letter indices to hide for a smart list, or null when the word has no target
 * letters (the caller then falls back to the regular 1-in-N hiding).
 * `struggleIndices` (logged-in learners' active patterns) replace the alternating
 * letters at L3.
 */
export function smartHiddenIndices(word, level, groups, struggleIndices = []) {
  const n = String(word || '').length;
  const targets = findTargets(word, groups);
  if (targets.length === 0) return null;
  const hidden = targetIndexSet(targets);
  if (level >= 4) return new Set(Array.from({ length: n }, (_, i) => i));
  if (level === 3) {
    const struggle = [...(struggleIndices || [])].filter(i => Number.isInteger(i) && i >= 0 && i < n && !hidden.has(i));
    if (struggle.length) struggle.forEach(i => hidden.add(i));
    else for (let i = 1; i < n; i += 2) hidden.add(i);
  }
  return hidden;
}

/** Level wording for smart lists (same 4 levels as LEVELS in schedule.js). */
export const SMART_LEVEL_LABELS = [
  'Pick the focus letters',
  'Type the focus letters',
  'Focus letters + every other letter',
  'No letters shown'
];

/** Harvey-ball fill (0-4 quarters) = levels passed. */
export function quartersFor(state) {
  if (!state) return 0;
  if (state.mastered) return 4;
  return Math.max(0, Math.min(3, (state.level || 1) - 1));
}

/** "Level 2 of 4" / "Learned" / "Not started" — always shown next to a Harvey ball. */
export function levelText(state, max = 4) {
  if (!state) return 'Not started';
  if (state.mastered) return 'Learned';
  return `Level ${state.level} of ${max}`;
}

/** Lesson hints that mention a focus group found in this word (shown after a miss). */
export function hintsForWord(word, groups, hints) {
  if (!Array.isArray(hints) || !hints.length) return [];
  const found = new Set(findTargets(word, groups).map(t => t.group));
  if (!found.size) return [];
  return hints.filter(h => [...found].some(g => new RegExp(`\\b${g}\\b`, 'i').test(h)));
}
