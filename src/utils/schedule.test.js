import { describe, it, expect } from 'vitest';
import {
  hiddenIndicesForLevel, outcomeFor, alignSpelling, gapAfterPass, applyResult, applyQuizResult,
  buildQueue, requeueFront, shuffleQueue, addDays, DEFAULT_PREFS
} from './schedule';

const empty = { words: {} };
const MON = '2026-10-05';
const TEST = '2026-10-09'; // Friday

describe('hiddenIndicesForLevel', () => {
  it('hides every other letter at level 1', () => {
    expect([...hiddenIndicesForLevel(6, 1)]).toEqual([1, 3, 5]);
  });
  it('shows 1 in 3 / 1 in 4 at levels 2 and 3', () => {
    expect([...hiddenIndicesForLevel(6, 2)]).toEqual([1, 2, 4, 5]);
    expect([...hiddenIndicesForLevel(8, 3)]).toEqual([1, 2, 3, 5, 6, 7]);
  });
  it('shows 1 in 5 letters at level 4', () => {
    expect([...hiddenIndicesForLevel(7, 4)]).toEqual([1, 2, 3, 4, 6]);
  });
  it('hides everything at level 5 and never returns an empty set', () => {
    expect(hiddenIndicesForLevel(4, 5).size).toBe(4);
    expect([...hiddenIndicesForLevel(1, 1)]).toEqual([0]);
  });
});

describe('outcomeFor', () => {
  it('uses 100 / 60 thresholds', () => {
    expect(outcomeFor(100)).toBe('advance');
    expect(outcomeFor(99)).toBe('stay');
    expect(outcomeFor(60)).toBe('stay');
    expect(outcomeFor(59)).toBe('drop');
  });
});

describe('alignSpelling', () => {
  it('scores exact answers 100', () => expect(alignSpelling('pretty', 'pretty').pct).toBe(100));
  it('tolerates one dropped letter', () => expect(alignSpelling('prety', 'pretty').pct).toBe(83));
  it('penalizes extra letters', () => expect(alignSpelling('prettyy', 'pretty').pct).toBe(86));
  it('handles empty input', () => expect(alignSpelling('', 'pretty').pct).toBe(0));
});

describe('gapAfterPass (Mon-Sat practice, Sunday test)', () => {
  const SUN = addDays(MON, 6);
  it('spaces one level per day across the week', () => {
    expect(gapAfterPass(1, MON, SUN)).toBe(1);
    expect(gapAfterPass(2, addDays(MON, 1), SUN)).toBe(1);
    expect(gapAfterPass(3, addDays(MON, 2), SUN)).toBe(1);
    expect(gapAfterPass(4, addDays(MON, 3), SUN)).toBe(1);
  });
  it('goes into crunch (0) when days are short', () => {
    expect(gapAfterPass(1, MON, TEST)).toBe(0);
    expect(gapAfterPass(1, addDays(MON, 3), TEST)).toBe(0);
  });
  it('stretches with a long runway', () => {
    expect(gapAfterPass(1, MON, addDays(MON, 14))).toBe(2);
  });
  it('uses fixed gaps with no test date', () => {
    expect([1, 2, 3, 4].map(l => gapAfterPass(l, MON, null))).toEqual([1, 2, 4, 7]);
  });
});

describe('applyResult', () => {
  const ctx = { prefs: DEFAULT_PREFS, today: MON, testDate: TEST };

  it('perfect week: advances one level per day to mastered', () => {
    const wk = { ...ctx, testDate: addDays(MON, 6) };
    let p = empty;
    for (let d = 0; d < 4; d++) {
      const today = addDays(MON, d);
      const r = applyResult(p, 'kitten', 100, { ...wk, today });
      expect(r.requeue).toBe(false);
      expect(r.progress.words.kitten.level).toBe(d + 2);
      expect(r.progress.words.kitten.due).toBe(addDays(today, 1));
      p = r.progress;
    }
    const r = applyResult(p, 'kitten', 100, { ...wk, today: addDays(MON, 4) });
    expect(r.progress.words.kitten.mastered).toBe(true);
    expect(r.progress.words.kitten.due).toBe(addDays(MON, 5));
  });

  it('keeps only the last 10 attempts as history, with the level each was made at', () => {
    let p = empty;
    for (let i = 0; i < 12; i++) p = applyResult(p, 'kitten', 80, ctx).progress;
    const h = p.words.kitten.history;
    expect(h).toHaveLength(10);
    expect(h[0]).toEqual({ pct: 80, level: 1 });
    expect(applyResult(empty, 'kitten', 100, ctx).progress.words.kitten.history).toEqual([{ pct: 100, level: 1 }]);
  });

  it('a miss drops a level and requeues; the retry climbs back', () => {
    let p = { words: { kitten: { level: 2, mastered: false, due: MON, lastScore: null, advancedOn: null, attempts: 0 } } };
    const wk = { ...ctx, testDate: addDays(MON, 6) };
    let r = applyResult(p, 'kitten', 50, wk);
    expect(r.outcome).toBe('drop');
    expect(r.requeue).toBe(true);
    expect(r.progress.words.kitten.level).toBe(1);
    r = applyResult(r.progress, 'kitten', 100, wk);
    expect(r.requeue).toBe(false);
    expect(r.progress.words.kitten.level).toBe(2);
  });

  it('partial credit stays and requeues', () => {
    const r = applyResult(empty, 'kitten', 80, ctx);
    expect(r.outcome).toBe('stay');
    expect(r.requeue).toBe(true);
    expect(r.progress.words.kitten.level).toBe(1);
  });

  it('allows only one level up per day outside crunch', () => {
    const p = { words: { kitten: { level: 2, mastered: false, due: MON, lastScore: 100, advancedOn: MON, attempts: 1 } } };
    const r = applyResult(p, 'kitten', 100, ctx);
    expect(r.progress.words.kitten.level).toBe(2);
    expect(r.requeue).toBe(false);
  });

  it('crunch (late start) requeues in-session at the next level', () => {
    const thu = addDays(MON, 3);
    const r = applyResult(empty, 'kitten', 100, { ...ctx, today: thu });
    expect(r.requeue).toBe(true);
    expect(r.progress.words.kitten.level).toBe(2);
    expect(r.next.kind).toBe('again-today');
  });

  it('mastered words get a final check on the last practice day', () => {
    const p = { words: { kitten: { level: 5, mastered: false, due: MON, lastScore: 100, advancedOn: null, attempts: 3 } } };
    const r = applyResult(p, 'kitten', 100, ctx);
    expect(r.progress.words.kitten.due).toBe(addDays(TEST, -1));
  });
});

describe('applyQuizResult', () => {
  const ctx = { prefs: DEFAULT_PREFS, today: MON, testDate: TEST };
  it('100% tests the word out', () => {
    const r = applyQuizResult(empty, 'kitten', 100, ctx);
    expect(r.testedOut).toBe(true);
    expect(r.progress.words.kitten).toMatchObject({ mastered: true, level: 5 });
  });
  it('a miss on a learned word un-learns it (latest attempt wins)', () => {
    const learned = applyQuizResult(empty, 'kitten', 100, ctx).progress;
    const r = applyQuizResult(learned, 'kitten', 60, ctx);
    expect(r.unlearned).toBe(true);
    expect(r.progress.words.kitten).toMatchObject({ mastered: false, level: 4, due: MON, lastScore: 60 });
  });
  it('a miss on an unlearned word changes nothing', () => {
    const r = applyQuizResult(empty, 'kitten', 70, ctx);
    expect(r.testedOut).toBe(false);
    expect(r.progress).toBe(empty);
  });
});

describe('queue', () => {
  it('orders struggling, then due, then unseen; skips future-due and mastered', () => {
    const p = { words: {
      a: { level: 2, due: MON, lastScore: 100, mastered: false },
      b: { level: 1, due: MON, lastScore: 40, mastered: false },
      c: { level: 2, due: addDays(MON, 2), lastScore: 100, mastered: false },
      d: { level: 4, due: null, lastScore: 100, mastered: true }
    } };
    expect(buildQueue(['a', 'b', 'c', 'd', 'e'], p, MON)).toEqual(['b', 'a', 'e']);
  });
  it('requeueFront moves the first card 3 later', () => {
    expect(requeueFront(['a', 'b', 'c', 'd', 'e'])).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(requeueFront(['a'])).toEqual(['a']);
  });
});

describe('shuffleQueue', () => {
  it('keeps every card and never puts the just-answered card first', () => {
    for (let n = 0; n < 50; n++) {
      const q = shuffleQueue(['a', 'b', 'c', 'd'], 'a');
      expect([...q].sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(q[0]).not.toBe('a');
    }
  });
  it('leaves a single card alone and actually reorders', () => {
    expect(shuffleQueue(['a'], 'a')).toEqual(['a']);
    const seen = new Set(Array.from({ length: 40 }, () => shuffleQueue(['a', 'b', 'c', 'd']).join('')));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('past test date', () => {
  it('keeps words due today after a pass instead of scheduling in the past', () => {
    const past = '2026-10-01';
    const r = applyResult(empty, 'a', 100, { prefs: DEFAULT_PREFS, today: MON, testDate: past });
    expect(r.progress.words.a.due >= MON).toBe(true);
  });
});
