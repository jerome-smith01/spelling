import { useMemo } from 'react';
import { useLists } from './useLists';
import { DEFAULT_LIST_ID } from '../services/storageService';
import { parseWordList, DEFAULT_RAW_WORDS } from '../utils/wordParser';

// Re-exported so existing imports keep working
export { parseWordList, DEFAULT_RAW_WORDS };

/**
 * Words for one list, addressed by list id (the :listId route param).
 * Persistence and cloud sync live in ListsProvider; this hook only derives
 * the parsed words and exposes save/reset for that list.
 */
export function useWordList(listId) {
  const { getList, saveWords } = useLists();
  const list = getList(listId);
  const rawList = list?.wordsRaw ?? '';

  const words = useMemo(() => parseWordList(rawList), [rawList]);

  /**
   * Save pasted words. Editing the built-in default creates a new list, so the
   * result includes the (possibly new) list id for the caller to navigate to.
   */
  const importWords = (newRawText, extra) => {
    const parsed = parseWordList(newRawText);
    if (parsed.length === 0) {
      return { success: false, error: 'No valid words found in import text.' };
    }
    if (new TextEncoder().encode(newRawText).length > 20 * 1024) {
      return { success: false, error: 'That list is too long (20 KB maximum).' };
    }
    const savedId = saveWords(listId, newRawText.trim(), extra);
    return { success: true, count: parsed.length, listId: savedId };
  };

  const resetToDefault = () => {
    if (listId !== DEFAULT_LIST_ID) saveWords(listId, DEFAULT_RAW_WORDS);
  };

  return { list, rawList, words, importWords, resetToDefault };
}
