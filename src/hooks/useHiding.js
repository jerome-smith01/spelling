import { useState, useEffect } from 'react';

const HIDING_STORAGE_KEY = 'spelling_tutor_hiding_state_v1';

export function useHiding(words) {
  // Denominator: 2 (1 in 2), 3 (1 in 3), or 'all'
  const [denominator, setDenominator] = useState(2);

  // Map of wordId -> Set of hidden letter indices (stored as Array in JSON)
  const [hiddenMap, setHiddenMap] = useState(() => {
    try {
      const saved = localStorage.getItem(HIDING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = {};
        for (const [k, v] of Object.entries(parsed)) {
          map[k] = new Set(v);
        }
        return map;
      }
    } catch {
      // Ignore
    }
    return {};
  });

  // Save to localStorage whenever hiddenMap changes
  useEffect(() => {
    try {
      const serializable = {};
      for (const [k, set] of Object.entries(hiddenMap)) {
        serializable[k] = Array.from(set);
      }
      localStorage.setItem(HIDING_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore
    }
  }, [hiddenMap]);

  /**
   * Calculates which indices to hide based on current word length and ratio.
   * If some are already hidden, hides the next available visible letters.
   */
  const hideNextLettersForWord = (wordId, letterCount) => {
    setHiddenMap(prev => {
      const current = prev[wordId] ? new Set(prev[wordId]) : new Set();
      const allIndices = Array.from({ length: letterCount }, (_, i) => i);
      const visibleIndices = allIndices.filter(i => !current.has(i));

      if (visibleIndices.length === 0) {
        return prev; // All letters already hidden
      }

      if (denominator === 'all') {
        visibleIndices.forEach(i => current.add(i));
      } else {
        const step = Number(denominator);
        const toHide = [];

        // Hide every Nth letter among the REMAINING visible letters (e.g. index 1, 3, 5 for step=2)
        for (let k = step - 1; k < visibleIndices.length; k += step) {
          toHide.push(visibleIndices[k]);
        }

        // If visible count is fewer than step (e.g. 1 letter remaining), hide it to progress toward 100% hidden
        if (toHide.length === 0 && visibleIndices.length > 0) {
          toHide.push(visibleIndices[visibleIndices.length - 1]);
        }

        toHide.forEach(idx => current.add(idx));
      }

      return { ...prev, [wordId]: current };
    });
  };

  /**
   * Reveals letters for a word (shows all visible or undoes one).
   */
  const showAllLettersForWord = (wordId) => {
    setHiddenMap(prev => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  /**
   * Applies progressive hiding across all words in the list.
   */
  const hideAllWords = () => {
    setHiddenMap(prev => {
      const next = {};
      for (const w of words) {
        const current = prev[w.id] ? new Set(prev[w.id]) : new Set();
        const allIndices = Array.from({ length: w.letterCount }, (_, i) => i);
        const visibleIndices = allIndices.filter(i => !current.has(i));

        if (visibleIndices.length === 0) {
          next[w.id] = current;
          continue;
        }

        if (denominator === 'all') {
          allIndices.forEach(i => current.add(i));
        } else {
          const step = Number(denominator);
          const toHide = [];
          for (let k = step - 1; k < visibleIndices.length; k += step) {
            toHide.push(visibleIndices[k]);
          }
          if (toHide.length === 0 && visibleIndices.length > 0) {
            toHide.push(visibleIndices[visibleIndices.length - 1]);
          }
          toHide.forEach(idx => current.add(idx));
        }
        next[w.id] = current;
      }
      return next;
    });
  };

  /**
   * Reveals all letters across every word.
   */
  const showAllWords = () => {
    setHiddenMap({});
  };

  return {
    denominator,
    setDenominator,
    hiddenMap,
    hideNextLettersForWord,
    showAllLettersForWord,
    hideAllWords,
    showAllWords
  };
}
