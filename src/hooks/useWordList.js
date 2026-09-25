import { useState, useEffect } from 'react';

export const DEFAULT_RAW_WORDS = `lov-ing
joy-ful
pret-ty (prit-tee)
hand-some (hand-sum)
kit-ten
pup-py`;

const STORAGE_KEY = 'spelling_tutor_words_v4';

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
      id: `w_${fullWord}_${Math.random().toString(36).substring(2, 9)}`,
      raw: cleanLine,
      word: fullWord,
      syllables,            // array of letter arrays: [[{index, char}], ...]
      pronunciationSyllables, // string[] | null — teacher override for TTS
      letterCount: globalLetterIndex
    });
  }

  return words;
}

export function useWordList() {
  const [rawList, setRawList] = useState(() => {
    try {
      const v4 = localStorage.getItem(STORAGE_KEY);
      if (v4 && v4.trim()) return v4;

      const v3 = localStorage.getItem('spelling_tutor_words_v3');
      if (v3) {
        return v3.replace(/hand-some\s*\(\s*han-sum\s*\)/g, 'hand-some (hand-sum)');
      }

      const v2 = localStorage.getItem('spelling_tutor_words_v2');
      if (v2) {
        const oldDefault = `lov-ing\njoy-ful\npret-ty\nhand-some\nkit-ten\npup-py`;
        if (v2.trim() === oldDefault.trim()) {
          return DEFAULT_RAW_WORDS;
        }
        return v2;
      }
      return DEFAULT_RAW_WORDS;
    } catch {
      return DEFAULT_RAW_WORDS;
    }
  });

  const [words, setWords] = useState(() => parseWordList(rawList));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, rawList);
    } catch {
      // Ignore storage errors in restricted contexts
    }
    setWords(parseWordList(rawList));
  }, [rawList]);

  const importWords = (newRawText) => {
    const parsed = parseWordList(newRawText);
    if (parsed.length > 0) {
      setRawList(newRawText.trim());
      return { success: true, count: parsed.length };
    }
    return { success: false, error: 'No valid words found in import text.' };
  };

  const resetToDefault = () => {
    setRawList(DEFAULT_RAW_WORDS);
  };

  return {
    rawList,
    words,
    importWords,
    resetToDefault
  };
}
