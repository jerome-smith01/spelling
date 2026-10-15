import { describe, it, expect } from 'vitest';
import { buildPlainPick, optionsFor } from './plainChoice';

describe('buildPlainPick', () => {
  it('blanks one letter in a short word and two in a long one, never the first letter', () => {
    const short = buildPlainPick('cat');
    expect(short).toHaveLength(1);
    expect(short[0].start).toBeGreaterThan(0);
    expect(buildPlainPick('different')).toHaveLength(2);
  });

  it('blanks at least one vowel when the word has one', () => {
    for (const w of ['planet', 'friend', 'table', 'garden']) {
      expect(buildPlainPick(w).some(t => 'aeiou'.includes(t.group))).toBe(true);
    }
  });

  it('keeps blanks apart and in order', () => {
    const t = buildPlainPick('beautiful');
    expect(t[0].start).toBeLessThan(t[1].start);
    expect(t[1].start - t[0].start).toBeGreaterThan(1);
  });

  it('is deterministic: the same word always gets the same blanks and choices', () => {
    expect(buildPlainPick('elephant')).toEqual(buildPlainPick('elephant'));
  });

  it('each blank offers 4 distinct choices that include the answer', () => {
    for (const w of ['cat', 'rhythm', 'strengths', 'queue']) {
      for (const t of buildPlainPick(w)) {
        expect(t.options).toHaveLength(4);
        expect(new Set(t.options).size).toBe(4);
        expect(t.options).toContain(t.group);
      }
    }
  });

  it('copes with a word that has no good inner letter', () => {
    expect(buildPlainPick('a')).toHaveLength(1);
    expect(buildPlainPick('')).toEqual([]);
  });
});

describe('optionsFor', () => {
  it('offers look-alikes first for consonants and other vowels for vowels', () => {
    const rand = () => 0.5;
    expect(optionsFor('b', rand)).toEqual(expect.arrayContaining(['b', 'd', 'p']));
    expect(optionsFor('a', rand).every(c => 'aeiou'.includes(c))).toBe(true);
  });
});
