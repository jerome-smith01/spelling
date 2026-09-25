/**
 * Syllable Phonetics Engine
 *
 * Transforms individual syllable fragments into more accurate TTS-friendly
 * pronunciations. The Web Speech API pronounces isolated fragments as
 * standalone English words, which causes errors like:
 *   "ty"  → sounds like "tuh"  (should be "tee")
 *   "tion" → sounds like "tee-on" (should be "shun")
 *   "ble" → sounds like "bluh" (should be "bul")
 *
 * Two layers of correction:
 *   1. Auto-rules: applied silently to every word's syllables.
 *   2. Phonetic override: teacher-provided in word list as `pret-ty (prit-tee)`.
 *      When present, overrides auto-rules for that specific word.
 */

/**
 * Auto-phonetic rules applied to individual syllable fragments.
 * Rules are tested in order; first match wins for each syllable.
 * All patterns are case-insensitive; replacement is lowercase.
 */
const PHONETIC_RULES = [
  // Trailing '-tion' → 'shun'  (na-tion, ac-tion, na-tion-al)
  { pattern: /tion$/i, replacement: 'shun' },

  // Trailing '-ssion' or '-sion' → 'shun'  (pas-sion, mis-sion)
  // Note: vision/zhun handled by override since auto-rule would be wrong
  { pattern: /ssion$/i, replacement: 'shun' },
  { pattern: /sion$/i,  replacement: 'shun' },

  // Trailing 'y' after one or more consonants → 'ee'
  // Covers: ty→tee, py→pee, ny→nee, ly→lee, ry→ree, dy→dee, etc.
  // e.g.  "ty" → "tee"   "py" → "pee"   "ly" → "lee"
  { pattern: /([bcdfghjklmnpqrstvwxz]+)y$/i, replacement: '$1ee' },

  // Standalone syllable that is exactly 'y' → 'ee'  (e.g. y as prefix split)
  { pattern: /^y$/i, replacement: 'ee' },

  // Consonant + 'le' as a trailing syllable → consonant + 'ul'
  // e.g. "ble"→"bul", "tle"→"tul", "gle"→"gul", "kle"→"kul"
  { pattern: /([bcdfghjklmnpqrstvwxz])le$/i, replacement: '$1ul' },

  // Trailing '-er' → 'ur'  (lov-er, teach-er, sis-ter)
  // Only when preceded by a letter (avoids transforming standalone 'er')
  { pattern: /([a-z])er$/i, replacement: '$1ur' },

  // Trailing '-some' → 'sum'  (hand-some, awe-some, tire-some)
  { pattern: /some$/i, replacement: 'sum' },
];

/**
 * Apply phonetic correction rules to a single syllable text fragment.
 * Returns the TTS-friendly pronunciation string.
 * @param {string} syllableText - Raw syllable text (e.g. "ty", "tion")
 * @returns {string} Corrected pronunciation text (e.g. "tee", "shun")
 */
export function applyPhoneticRules(syllableText) {
  if (!syllableText) return syllableText;
  let result = syllableText.toLowerCase();
  for (const { pattern, replacement } of PHONETIC_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      break; // Only one rule per syllable — prevents double-transforms
    }
  }
  return result;
}

/**
 * Known irregular word syllable mappings where standard auto-rules or browser TTS
 * fail (e.g. 'pretty' -> ['prit', 'tee']).
 */
const IRREGULAR_WORD_MAP = {
  pretty: ['prit', 'tee'],
  handsome: ['han', 'sum'],
  busy: ['biz', 'ee'],
  business: ['biz', 'nes'],
  women: ['wim', 'in'],
  sugar: ['shoog', 'ur'],
  water: ['wah', 'tur'],
  people: ['pee', 'pul']
};

/**
 * Build the array of strings to speak for each syllable of a word.
 * Priority:
 *   1. word.pronunciationSyllables (teacher-provided override, e.g. ["prit", "tee"])
 *   2. Built-in irregular dictionary for well-known phonetic anomalies
 *   3. Auto-phonetic rules applied to each spelling syllable
 *
 * @param {object} word - A parsed word object from useWordList
 * @returns {string[]} Array of pronunciation strings, one per syllable
 */
export function buildPronunciationSyllables(word) {
  const syllableCount = word.syllables.length;

  // Layer 1: Use explicit teacher override if present and syllable count matches
  if (
    word.pronunciationSyllables &&
    word.pronunciationSyllables.length === syllableCount
  ) {
    return word.pronunciationSyllables;
  }

  // Layer 2: Built-in irregular word dictionary
  const normalizedWord = (word.word || '').toLowerCase();
  if (
    IRREGULAR_WORD_MAP[normalizedWord] &&
    IRREGULAR_WORD_MAP[normalizedWord].length === syllableCount
  ) {
    return IRREGULAR_WORD_MAP[normalizedWord];
  }

  // Layer 3: Auto-apply phonetic rules to each spelling syllable
  return word.syllables.map(syllableLetters => {
    const text = syllableLetters.map(item => item.char).join('');
    return applyPhoneticRules(text);
  });
}
