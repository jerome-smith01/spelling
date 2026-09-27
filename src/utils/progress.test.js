import { describe, it, expect } from 'vitest';
import { bucketWords, formatDay, formatSqlDate, isMastered, wordAccuracy } from './progress';

const w = (word, friction, extra = {}) => ({ word, friction_score: friction, attempt_count: 10, error_count: 2, perfect_streak: 0, mastered_at: null, ...extra });

describe('bucketWords', () => {
  it('sorts words into mastered, struggling, needs practice and steady', () => {
    const b = bucketWords([
      w('cat', 0, { perfect_streak: 3, mastered_at: '2026-09-01 10:00:00' }),
      w('loving', 90),
      w('hiking', 45),
      w('boat', 20),
      w('dog', 0)
    ]);
    expect(b.mastered.map(s => s.word)).toEqual(['cat']);
    expect(b.struggling.map(s => s.word)).toEqual(['loving', 'hiking']);   // hardest first
    expect(b.needsPractice.map(s => s.word)).toEqual(['boat']);
    expect(b.steady.map(s => s.word)).toEqual(['dog']);
  });

  it('puts the flame threshold (40) in struggling and 39 in needs practice', () => {
    const b = bucketWords([w('a', 40), w('b', 39)]);
    expect(b.struggling.map(s => s.word)).toEqual(['a']);
    expect(b.needsPractice.map(s => s.word)).toEqual(['b']);
  });

  it('a mastered word that slipped again is no longer mastered', () => {
    expect(isMastered(w('cat', 10, { mastered_at: '2026-09-01 10:00:00' }))).toBe(false);
    expect(isMastered(w('cat', 0, { mastered_at: '2026-09-01 10:00:00' }))).toBe(true);
    expect(isMastered(w('cat', 0, { perfect_streak: 3 }))).toBe(true);
  });

  it('breaks friction ties alphabetically and handles empty input', () => {
    expect(bucketWords([w('b', 50), w('a', 50)]).struggling.map(s => s.word)).toEqual(['a', 'b']);
    expect(bucketWords(null)).toEqual({ mastered: [], struggling: [], needsPractice: [], steady: [] });
  });
});

describe('formatting helpers', () => {
  it('computes accuracy, guarding against zero attempts', () => {
    expect(wordAccuracy({ attempt_count: 10, error_count: 2 })).toBe(80);
    expect(wordAccuracy({ attempt_count: 0, error_count: 0 })).toBe(0);
  });

  it('formats dates safely', () => {
    expect(formatSqlDate(null)).toBe('—');
    expect(formatSqlDate('not a date')).toBe('—');
    expect(formatSqlDate('2026-09-20 12:00:00')).not.toBe('—');
    expect(formatDay('2026-09-20')).toMatch(/20/);
    expect(formatDay('garbage')).toBe('');
  });
});
