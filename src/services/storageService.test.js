// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LISTS_KEY, isUuid, legacyWordsToMigrate, loadLists, migrateLegacy, saveLists
} from './storageService';
import { DEFAULT_RAW_WORDS, parseWordList } from '../utils/wordParser';

beforeEach(() => localStorage.clear());

describe('isUuid', () => {
  it('accepts v4 uuids and rejects others', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isUuid('default')).toBe(false);
    expect(isUuid('../etc')).toBe(false);
  });
});

describe('legacy migration (v4/v3/v2 -> v5)', () => {
  it('does nothing when nothing custom is stored', () => {
    expect(loadLists()).toEqual([]);
  });

  it('does not migrate a stored copy of the default list', () => {
    localStorage.setItem('spelling_tutor_words_v4', DEFAULT_RAW_WORDS);
    expect(legacyWordsToMigrate()).toBeNull();
    expect(loadLists()).toEqual([]);
  });

  it('turns a custom v4 list into a dirty "My Words" list and persists it', () => {
    localStorage.setItem('spelling_tutor_words_v4', 'con-trol\nspeak-er');
    const lists = loadLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ name: 'My Words', wordsRaw: 'con-trol\nspeak-er', dirty: true, deleted: false });
    expect(isUuid(lists[0].id)).toBe(true);
    // Second load reads v5, not legacy again
    expect(loadLists()[0].id).toBe(lists[0].id);
  });

  it('prefers v4 over older versions and fixes the v3 handsome typo', () => {
    localStorage.setItem('spelling_tutor_words_v3', 'hand-some (han-sum)\nkit-ten');
    expect(legacyWordsToMigrate()).toBe('hand-some (hand-sum)\nkit-ten');
    localStorage.setItem('spelling_tutor_words_v4', 'only-v4');
    expect(legacyWordsToMigrate()).toBe('only-v4');
  });

  it('migrateLegacy accepts injected clock/id for determinism', () => {
    const read = (k) => (k === 'spelling_tutor_words_v2' ? 'a-b' : null);
    const out = migrateLegacy(read, () => 'T', () => 'ID');
    expect(out[0]).toMatchObject({ id: 'ID', updatedAt: 'T', wordsRaw: 'a-b' });
  });
});

describe('loadLists robustness', () => {
  it('drops malformed entries and survives corrupt JSON', () => {
    saveLists([
      { id: 'not-a-uuid', wordsRaw: 'a' },
      { id: '11111111-1111-4111-8111-111111111111', wordsRaw: 'a-b', name: '  ' }
    ]);
    const lists = loadLists();
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe('Untitled list');
    localStorage.setItem(LISTS_KEY, '{oops');
    expect(loadLists()).toEqual([]);
  });
});

describe('parseWordList ids', () => {
  it('are deterministic across parses', () => {
    const a = parseWordList('lov-ing\njoy-ful').map(w => w.id);
    const b = parseWordList('lov-ing\njoy-ful').map(w => w.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(2);
  });
});
