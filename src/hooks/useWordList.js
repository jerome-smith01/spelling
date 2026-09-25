import { useState, useEffect } from 'react';

export const DEFAULT_RAW_WORDS = `lov-ing
joy-ful
pret-ty
hand-some
kit-ten
pup-py`;

const STORAGE_KEY = 'spelling_tutor_words_v2';

/**
 * Parses raw hyphenated text into word objects with syllable breakdowns
 * and linear letter indices for straightforward focus and verification.
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

    // Split on hyphens to isolate syllables
    const rawSyllables = cleanLine
      .split('-')
      .map(s => s.trim())
      .filter(Boolean);

    if (rawSyllables.length === 0) continue;

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
      syllables, // array of letter arrays: [[{index, char}], ...]
      letterCount: globalLetterIndex
    });
  }

  return words;
}

export function useWordList() {
  const [rawList, setRawList] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved && saved.trim() ? saved : DEFAULT_RAW_WORDS;
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
