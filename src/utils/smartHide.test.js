import { describe, it, expect } from 'vitest';
import {
  parseFocusGroups, findTargets, smartHiddenIndices, quartersFor, levelText, hintsForWord
} from './smartHide';
import { hiddenIndicesForLevel } from './schedule';

const sorted = (s) => [...s].sort((a, b) => a - b);
const mask = (word, set) => [...word].map((c, i) => (set.has(i) ? '_' : c)).join('');
const GROUPS = ['ou', 'ow', 'oi', 'oy'];

describe('parseFocusGroups', () => {
  it('splits on commas, spaces and slashes, lowercases and de-duplicates', () => {
    expect(parseFocusGroups('OU, ow / oi oy, ou')).toEqual(['ou', 'ow', 'oi', 'oy']);
  });
  it('drops anything that is not 1-4 letters', () => {
    expect(parseFocusGroups('ou, <b>, 12, abcde, o-u')).toEqual(['ou']);
  });
  it('accepts an array', () => {
    expect(parseFocusGroups(['Ou', 'oy'])).toEqual(['ou', 'oy']);
  });
});

describe('findTargets', () => {
  it('finds ou in thousand', () => {
    expect(findTargets('thousand', GROUPS)).toEqual([{ group: 'ou', start: 2, end: 4 }]);
  });
  it('matches the longest group first (ow in shower, not o + w)', () => {
    expect(findTargets('shower', ['o', 'ow'])).toEqual([{ group: 'ow', start: 2, end: 4 }]);
  });
  it('finds several targets', () => {
    expect(findTargets('cowboy', GROUPS).map(t => t.group)).toEqual(['ow', 'oy']);
  });
  it('returns [] when the pattern is absent', () => {
    expect(findTargets('kitten', GROUPS)).toEqual([]);
  });
});

describe('smartHiddenIndices — worked example "thousand"', () => {
  it('L1 and L2 hide only ou', () => {
    expect(mask('thousand', smartHiddenIndices('thousand', 1, GROUPS))).toBe('th__sand');
    expect(mask('thousand', smartHiddenIndices('thousand', 2, GROUPS))).toBe('th__sand');
  });
  it('L3 adds every other letter from the 2nd, skipping targets', () => {
    const s = smartHiddenIndices('thousand', 3, GROUPS);
    expect(sorted(s)).toEqual([1, 2, 3, 5, 7]);
    expect(mask('thousand', s)).toBe('t___s_n_');
  });
  it('L3 struggle override replaces the alternating letters', () => {
    expect(mask('thousand', smartHiddenIndices('thousand', 3, GROUPS, [6, 7]))).toBe('th__sa__');
  });
  it('L4 hides everything', () => {
    expect(mask('thousand', smartHiddenIndices('thousand', 4, GROUPS))).toBe('________');
  });
  it('returns null when the word has no target letters', () => {
    expect(smartHiddenIndices('kitten', 2, GROUPS)).toBeNull();
  });
});

describe('hiddenIndicesForLevel with focus letters', () => {
  it('delegates to smart hiding', () => {
    expect(sorted(hiddenIndicesForLevel(8, 1, { word: 'thousand', groups: GROUPS }))).toEqual([2, 3]);
  });
  it('falls back to 1-in-N when the word has no targets', () => {
    expect(hiddenIndicesForLevel(6, 1, { word: 'kitten', groups: GROUPS })).toEqual(hiddenIndicesForLevel(6, 1));
  });
  it('lists without focus letters behave exactly as before', () => {
    expect(hiddenIndicesForLevel(8, 2, { word: 'thousand', groups: [] })).toEqual(hiddenIndicesForLevel(8, 2));
  });
});

describe('Harvey ball helpers', () => {
  it('fills one quarter per level passed', () => {
    expect(quartersFor(undefined)).toBe(0);
    expect(quartersFor({ level: 1 })).toBe(0);
    expect(quartersFor({ level: 2 })).toBe(1);
    expect(quartersFor({ level: 4 })).toBe(3);
    expect(quartersFor({ level: 4, mastered: true })).toBe(4);
  });
  it('labels the level in words', () => {
    expect(levelText(undefined)).toBe('Not started');
    expect(levelText({ level: 2 })).toBe('Level 2 of 4');
    expect(levelText({ level: 4, mastered: true })).toBe('Learned');
  });
});

describe('hintsForWord', () => {
  const hints = ['oy ends words, oi goes in the middle', 'ou says "ow" as in out'];
  it('returns hints that mention a group in the word', () => {
    expect(hintsForWord('boy', GROUPS, hints)).toEqual([hints[0]]);
    expect(hintsForWord('thousand', GROUPS, hints)).toEqual([hints[1]]);
  });
  it('returns nothing for words without targets', () => {
    expect(hintsForWord('kitten', GROUPS, hints)).toEqual([]);
  });
});
