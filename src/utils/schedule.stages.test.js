import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, MAX_LEVEL, applyResult, seedRemoteStages, stagesOf } from './schedule';

const TODAY = '2026-10-14';
const ctx = { prefs: DEFAULT_PREFS, today: TODAY };
const empty = () => ({ testDate: null, words: {} });
const withWords = (words) => ({ testDate: null, words });
const st = (level, mastered = false, extra = {}) => ({ level, mastered, due: TODAY, lastScore: null, advancedOn: null, attempts: 0, ...extra });

describe('stagesOf', () => {
  it('reports the stage of every practiced word, clamped to the ladder', () => {
    expect(stagesOf(withWords({ cat: st(3), dog: st(5, true), odd: st(99), none: { mastered: false } }))).toEqual({
      cat: { level: 3, mastered: false }, dog: { level: 5, mastered: true }, odd: { level: MAX_LEVEL, mastered: false }, none: { level: 1, mastered: false }
    });
    expect(stagesOf(empty())).toEqual({});
  });
  it('has five stages: pick the letters, three with letters visible, then the audio quiz', () => { expect(MAX_LEVEL).toBe(5); });
});

describe('seedRemoteStages', () => {
  it('starts a word this device has never practiced where the server has it', () => {
    const next = seedRemoteStages(empty(), { dog: { level: 3, mastered: false } }, ctx);
    expect(next.words.dog).toMatchObject({ level: 3, mastered: false, due: TODAY });
  });
  it('a mastered word on the server starts mastered, at the last stage, not due', () => {
    const next = seedRemoteStages(empty(), { cat: { level: 5, mastered: true } }, ctx);
    expect(next.words.cat).toMatchObject({ level: 5, mastered: true, due: null });
  });
  it('never changes a word this device already has, even when the server is ahead (the latest practice counts)', () => {
    const progress = withWords({ cat: st(1), dog: st(2, false) });
    const next = seedRemoteStages(progress, { cat: { level: 5, mastered: true }, dog: { level: 4, mastered: false } }, ctx);
    expect(next).toBe(progress);                                           // nothing changed: the very same object
  });
  it('seeds only the words that are missing', () => {
    const next = seedRemoteStages(withWords({ cat: st(2) }), { cat: { level: 5, mastered: true }, dog: { level: 3, mastered: false } }, ctx);
    expect(next.words.cat.level).toBe(2);
    expect(next.words.dog.level).toBe(3);
  });
  it('ignores junk', () => {
    const progress = withWords({ cat: st(2) });
    expect(seedRemoteStages(progress, { x: null, dog: { level: 'x' } }, ctx)).toBe(progress);
    expect(seedRemoteStages(progress, undefined, ctx)).toBe(progress);
  });
  it('round-trips: what a device pushes, a fresh device starts from', () => {
    let p = empty();
    for (let i = 0; i < 3; i++) p = applyResult(p, 'cat', 100, { ...ctx, today: `2026-10-${14 + i}` }).progress;   // a pass a day
    const other = seedRemoteStages(empty(), stagesOf(p), ctx);
    expect(other.words.cat.level).toBe(p.words.cat.level);
  });
});

describe('a stage is passed at 100% when it is assigned', () => {
  it('80% advances with the saved threshold of 60, but not when strict (the hook sets advancePct 100)', () => {
    const lenient = applyResult(empty(), 'cat', 80, { prefs: { ...DEFAULT_PREFS, advancePct: 60 }, today: TODAY });
    expect(lenient.outcome).toBe('advance');
    const strict = applyResult(empty(), 'cat', 80, { prefs: { ...DEFAULT_PREFS, advancePct: 100 }, today: TODAY });
    expect(strict.outcome).toBe('stay');
    expect(strict.progress.words.cat.level).toBe(1);
  });
});
