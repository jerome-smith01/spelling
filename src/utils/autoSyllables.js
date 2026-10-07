/**
 * Auto-syllables (smart hiding, Phase 2): bundled dictionary first, then the AI
 * endpoint for the rest (logged-in users only). Failures leave words unsplit.
 */
import { splitSyllables } from '../services/smartApi';
import { lookupSyllables, isOneSyllable } from './syllableDictionary';
import { wordsNeedingSplit, applySplits } from './wordParser';

export async function findSplits(words) {
  const splits = {};
  const unknown = [];
  for (const w of words) {
    const s = lookupSyllables(w);
    if (s) splits[w] = s;
    else unknown.push(w);
  }
  if (unknown.length) {
    try {
      const res = await splitSyllables(unknown);
      Object.assign(splits, res?.splits || {});
    } catch {
      // Offline / quota / AI down: those words stay as typed
    }
  }
  return splits;
}

/** Split every unhyphenated word in raw text. Returns { text, changed }. */
export async function autoSplitText(raw) {
  const need = wordsNeedingSplit(raw, isOneSyllable);
  if (!need.length) return { text: raw, changed: [] };
  return applySplits(raw, await findSplits(need));
}
