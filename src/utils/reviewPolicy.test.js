import { describe, it, expect } from 'vitest';
import { isRushed, levelFor, RUSH_MS } from './reviewPolicy';
import { cellsFromSpelling, cellsFromPractice } from './reviewCells';

describe('reviewPolicy', () => {
  it('under one second is rushed', () => {
    expect(RUSH_MS).toBe(1000);
    expect(isRushed(400)).toBe(true);
    expect(isRushed(1000)).toBe(false);
    expect(isRushed(2500)).toBe(false);
  });
  it('strikes map to levels 1-3 and stop at 3', () => {
    expect([1, 2, 3, 4, 9].map(levelFor)).toEqual([1, 2, 3, 3, 3]);
  });
});

describe('reviewCells', () => {
  it('a swapped letter knows what belongs there', () => {
    expect(cellsFromSpelling('bi', 'boy')).toEqual([
      { ch: 'b', ok: true }, { ch: 'i', ok: false, fix: 'o' }, { ch: '', ok: false, fix: 'y' }
    ]);
  });
  it('a surplus letter has nothing to fix', () => {
    const c = cellsFromSpelling('cats', 'cat');
    expect(c[3]).toEqual({ ch: 's', ok: false, fix: null });
  });
  it('practice cells put the typed letter where it was wrong', () => {
    expect(cellsFromPractice('cat', ['', 'o', ''], [1])).toEqual([
      { ch: 'c', ok: true }, { ch: 'o', ok: false, fix: 'a' }, { ch: 't', ok: true }
    ]);
  });
});
