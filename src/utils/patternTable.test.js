// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { sortPatterns, accuracyQuarters, loadSort, saveSort, DEFAULT_SORT } from './patternTable';

const P = [
  { pattern: 'a', label: 'Alpha', attempts: 10, misses: 5, accuracy: 50, last_practiced: '2026-10-01 10:00:00' },
  { pattern: 'b', label: 'Beta', attempts: 2, misses: 0, accuracy: 100, last_practiced: '2026-10-05 10:00:00' },
  { pattern: 'c', label: 'Gamma', attempts: 30, misses: 27, accuracy: 10, last_practiced: '2026-09-01 10:00:00' }
];

describe('pattern table helpers', () => {
  beforeEach(() => localStorage.clear());
  it('sorts by least practiced, least known and most recent', () => {
    expect(sortPatterns(P, 'least-practiced').map(p => p.pattern)).toEqual(['b', 'a', 'c']);
    expect(sortPatterns(P, 'least-known').map(p => p.pattern)).toEqual(['c', 'a', 'b']);
    expect(sortPatterns(P, 'recent').map(p => p.pattern)).toEqual(['b', 'a', 'c']);
  });
  it('buckets accuracy to Harvey-ball quarters', () => {
    expect([null, 0, 12, 13, 50, 74, 88, 100].map(accuracyQuarters)).toEqual([0, 0, 0, 1, 2, 3, 4, 4]);
  });
  it('remembers the sort per user', () => {
    expect(loadSort('u1')).toBe(DEFAULT_SORT);
    saveSort('u1', 'recent');
    expect(loadSort('u1')).toBe('recent');
    expect(loadSort('u2')).toBe(DEFAULT_SORT);
    localStorage.setItem('spelling_tutor_pattern_sort_v1:u3', 'bogus');
    expect(loadSort('u3')).toBe(DEFAULT_SORT);
  });
});
