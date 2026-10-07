export const DEFAULT_RAW_WORDS = `lov-ing
joy-ful
pret-ty (prit-tee)
hand-some (hand-sum)
kit-ten
pup-py`;


/**
 * Parses raw hyphenated text into word objects with syllable breakdowns
 * and linear letter indices for straightforward focus and verification.
 *
 * Supports optional phonetic override syntax for syllable-by-syllable audio:
 *   pret-ty (prit-tee)
 * The part in parentheses is spoken by the turtle (🐢) button in place of
 * the raw spelling syllables. Syllable count must match the spelling part.
 * If omitted, the auto-phonetics engine corrects common patterns automatically.
 */
export function parseWordList(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split('\n');
  const words = [];

  for (const line of lines) {
    // Strip leading numbers/bullets (e.g., "1. ", "- ") and whitespace
    const cleanLine = line
      .replace(/^[\d\.\)\-\*\s]+/, '')
      .trim()
      .toLowerCase();

    if (!cleanLine) continue;

    // Extract optional phonetic override: "pret-ty (prit-tee)"
    // Group 1 = spelling part, Group 2 = phonetics part (inside parens)
    const phoneticMatch = cleanLine.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const spellingPart = phoneticMatch ? phoneticMatch[1].trim() : cleanLine;
    const phoneticPart = phoneticMatch ? phoneticMatch[2].trim() : null;

    if (!spellingPart) continue;

    // Split spelling part on hyphens to isolate syllables
    const rawSyllables = spellingPart
      .split('-')
      .map(s => s.trim())
      .filter(Boolean);

    if (rawSyllables.length === 0) continue;

    // Split phonetic part on hyphens (must match syllable count to be valid)
    const rawPhoneticSyllables = phoneticPart
      ? phoneticPart.split('-').map(s => s.trim()).filter(Boolean)
      : null;

    const pronunciationSyllables =
      rawPhoneticSyllables && rawPhoneticSyllables.length === rawSyllables.length
        ? rawPhoneticSyllables
        : null;

    let globalLetterIndex = 0;
    const syllables = rawSyllables.map((syl, sylIdx) => {
      const letters = syl.split('').map(char => {
        const item = {
          index: globalLetterIndex,
          char: char.toLowerCase(),
          syllableIndex: sylIdx
        };
        globalLetterIndex++;
        return item;
      });
      return letters;
    });

    const fullWord = rawSyllables.join('');

    words.push({
      id: `w_${words.length}_${fullWord}`, // deterministic: stable across re-parses
      raw: cleanLine,
      word: fullWord,
      syllables,            // array of letter arrays: [[{index, char}], ...]
      pronunciationSyllables, // string[] | null — teacher override for TTS
      letterCount: globalLetterIndex
    });
  }

  return words;
}

// ── Auto-syllables helpers (smart hiding, Phase 2) ─────────────────────────────

const LEAD = /^[\d.)\-*\s]+/;
const splitLine = (line) => {
  const lead = (line.match(LEAD) || [''])[0];
  const rest = line.slice(lead.length);
  const m = rest.match(/^(.*?)(\s*\([^)]+\)\s*)$/);
  return { lead, spelling: (m ? m[1] : rest).trim(), tail: m ? m[2] : '' };
};

/**
 * Words in raw text that have no hyphens and might have more than one syllable.
 * `isOneSyllable` filters out words that never need splitting.
 */
export function wordsNeedingSplit(rawText, isOneSyllable = () => false) {
  const out = [];
  for (const line of String(rawText || '').split('\n')) {
    const { spelling } = splitLine(line);
    const w = spelling.toLowerCase();
    if (!w || w.includes('-') || !/^[a-z']+$/.test(w) || isOneSyllable(w)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/**
 * Rewrite raw text with syllable splits ({ word: 'syl-la-ble' }). Hyphens the user
 * typed always win; a split is only applied if it is the same letters plus hyphens.
 * Returns { text, changed: [words split] }.
 */
export function applySplits(rawText, splits) {
  const changed = [];
  const text = String(rawText || '').split('\n').map(line => {
    const { lead, spelling, tail } = splitLine(line);
    const w = spelling.toLowerCase();
    const split = splits[w];
    if (!split || w.includes('-') || split === w || split.replace(/-/g, '') !== w) return line;
    changed.push(w);
    return `${lead}${split}${tail}`;
  }).join('\n');
  return { text, changed };
}
