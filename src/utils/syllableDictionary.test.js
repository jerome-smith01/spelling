import { describe, it, expect } from 'vitest';
import { lookupSyllables, isOneSyllable } from './syllableDictionary';
import { wordsNeedingSplit, applySplits } from './wordParser';
import { SYLLABLE_DATA } from './syllableData';

describe('syllable dictionary', () => {
  it('knows common lesson words', () => {
    expect(lookupSyllables('fountain')).toBe('foun-tain');
    expect(lookupSyllables('Thousand')).toBe('thou-sand');
    expect(lookupSyllables('zzzz')).toBeNull();
  });
  it('every entry is letters split by single hyphens with 2-6 syllables', () => {
    for (const e of SYLLABLE_DATA.split(/\s+/).filter(Boolean)) {
      expect(e.toLowerCase()).toMatch(/^[a-z']+(-[a-z']+){1,5}$/);
    }
  });
  it('spots one-syllable words', () => {
    for (const w of ['cat', 'boy', 'cloud', 'make', 'shout', 'yes']) expect(isOneSyllable(w)).toBe(true);
    for (const w of ['fountain', 'little', 'shower', 'baby']) expect(isOneSyllable(w)).toBe(false);
    // side-by-side vowels that are not one sound can hide a syllable break
    for (const w of ['lion', 'poem', 'quiet', 'idea']) expect(isOneSyllable(w)).toBe(false);
  });
});

describe('wordsNeedingSplit / applySplits', () => {
  const raw = '1. fountain\nfoun-tain\ncloud\nshower (shou-er)\nboy';
  it('lists unhyphenated multi-syllable words once, skipping one-syllable words', () => {
    expect(wordsNeedingSplit(raw, isOneSyllable)).toEqual(['fountain', 'shower']);
  });
  it('rewrites lines, keeping numbering and phonetics; typed hyphens win', () => {
    const { text, changed } = applySplits(raw, { fountain: 'foun-tain', shower: 'show-er', cloud: 'clo-ud' });
    expect(text).toBe('1. foun-tain\nfoun-tain\nclo-ud\nshow-er (shou-er)\nboy');
    expect(changed).toEqual(['fountain', 'cloud', 'shower']);
  });
  it('ignores splits that change the letters', () => {
    expect(applySplits('fountain', { fountain: 'fon-tain' }).changed).toEqual([]);
  });
});
