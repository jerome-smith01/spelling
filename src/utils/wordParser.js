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
