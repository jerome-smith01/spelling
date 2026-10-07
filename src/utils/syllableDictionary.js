/**
 * Auto-syllables, step 1: the bundled dictionary (no network, no AI).
 * Words it doesn't know go to POST /api/spelling/syllables (logged in only).
 */
import { SYLLABLE_DATA } from './syllableData';

let dict = null;
function table() {
  if (!dict) {
    dict = new Map();
    for (const entry of SYLLABLE_DATA.split(/\s+/)) {
      const split = entry.trim().toLowerCase();
      if (split) dict.set(split.replace(/-/g, ''), split);
    }
  }
  return dict;
}

/** 'fountain' -> 'foun-tain', or null when the dictionary doesn't know it. */
export function lookupSyllables(word) {
  return table().get(String(word || '').toLowerCase()) ?? null;
}

/**
 * Cheap check for words that can't have more than one syllable (one vowel sound:
 * cat, boy, cloud, make), so they never cost an AI call.
 */
export function isOneSyllable(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  const trimmed = /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w) ? w.slice(0, -1) : w; // silent final e
  const groups = trimmed.replace(/^y/, '').match(/[aeiouy]+/g) || [];
  return groups.length <= 1;
}
