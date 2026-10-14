import { describe, it, expect } from 'vitest';
import { makeSession, currentWord, recordResult, recordSkip, advance, goTo, endEarly, isComplete, sessionGrade, focusFor } from './session';

const fresh = () => ({ order: ['a', 'b', 'c'], status: {}, idx: 0, ended: false });

describe('makeSession', () => {
  it('keeps every word, starts on the first card, and does not reshuffle afterwards', () => {
    const s = makeSession(['a', 'b', 'c', 'd']);
    expect([...s.order].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(s.idx).toBe(0);
    expect(advance(s).order).toEqual(s.order);
  });
});

describe('session flow', () => {
  it('moves through the cards in order', () => {
    let s = fresh();
    s = advance(recordResult(s, 100));
    expect(currentWord(s)).toBe('b');
    s = advance(recordResult(s, 100));
    expect(currentWord(s)).toBe('c');
  });

  it('marks under 100% as a miss and loops back to it after the last card', () => {
    let s = fresh();
    s = advance(recordResult(s, 67)); // a missed
    s = advance(recordResult(s, 100)); // b ok
    s = advance(recordResult(s, 100)); // c ok
    expect(s.status).toEqual({ a: 'miss', b: 'ok', c: 'ok' });
    expect(currentWord(s)).toBe('a');
  });

  it('retries a missed card in place until it passes, then ends the session', () => {
    let s = { ...fresh(), status: { b: 'ok', c: 'ok' } };
    s = advance(recordResult(s, 50));
    expect(currentWord(s)).toBe('a');
    s = advance(recordResult(s, 100));
    expect(s.ended).toBe(true);
    expect(currentWord(s)).toBeNull();
    expect(isComplete(s)).toBe(true);
  });

  it('skip marks the card and moves on; a finished card stays ok when skipped', () => {
    let s = advance(recordSkip(fresh()));
    expect(s.status.a).toBe('skip');
    expect(currentWord(s)).toBe('b');
    const done = recordSkip({ ...fresh(), status: { a: 'ok' } });
    expect(done.status.a).toBe('ok');
  });

  it('goTo jumps to the nth card, even a finished one, and reopens an ended session', () => {
    let s = endEarly({ ...fresh(), status: { a: 'ok' } });
    s = goTo(s, 0);
    expect(s.ended).toBe(false);
    expect(currentWord(s)).toBe('a');
    expect(goTo(s, 9)).toBe(s);
  });
});

describe('sessionGrade', () => {
  it('is null before any card is graded', () => {
    expect(sessionGrade(fresh())).toBeNull();
  });

  it('averages first-try scores, so a later retry does not raise the grade', () => {
    let s = recordResult(fresh(), 50);
    s = recordResult(s, 100); // retry of the same card
    s = recordResult({ ...s, idx: 1 }, 100);
    expect(sessionGrade(s)).toEqual({ pct: 75, letter: 'C', cards: 2, perfect: 1 });
  });
});

describe('focus retries', () => {
  it('a letter missed twice starts a focus retry on just that letter', () => {
    let s = recordResult(fresh(), 67, [1]);
    expect(focusFor(s, 'a')).toBeNull();
    s = recordResult(s, 67, [1, 3]);
    expect(focusFor(s, 'a')).toEqual({ phase: 'focus', positions: [1] });
    expect(s.status.a).toBe('miss');
  });

  it('two different letters missed once each do not start one', () => {
    const s = recordResult(recordResult(fresh(), 67, [1]), 67, [2]);
    expect(focusFor(s, 'a')).toBeNull();
  });

  it('focus -> confirm -> ok, marked assisted', () => {
    let s = recordResult(recordResult(fresh(), 67, [1]), 67, [1]);
    s = recordResult(s, 100, []); // focus try right
    expect(focusFor(s, 'a').phase).toBe('confirm');
    expect(s.status.a).toBe('miss'); // not done until the normal-level try
    s = recordResult(s, 100, []); // confirm try right
    expect(s.status.a).toBe('ok');
    expect(s.assisted.a).toBe(true);
    expect(focusFor(s, 'a')).toBeNull();
  });

  it('a miss on the focus try stays in focus', () => {
    let s = recordResult(recordResult(fresh(), 67, [1]), 67, [1]);
    s = recordResult(s, 0, [1]);
    expect(focusFor(s, 'a')).toEqual({ phase: 'focus', positions: [1] });
  });

  it('a repeated miss on the confirm try goes back to focus', () => {
    let s = recordResult(recordResult(fresh(), 67, [1]), 67, [1]);
    s = recordResult(s, 100, []);
    s = recordResult(s, 67, [1]);
    expect(focusFor(s, 'a')).toEqual({ phase: 'focus', positions: [1] });
    expect(s.assisted.a).toBeUndefined();
  });

  it('the session grade still counts only the first try', () => {
    let s = recordResult(recordResult(fresh(), 50, [1]), 67, [1]);
    s = recordResult(recordResult(s, 100, []), 100, []);
    expect(sessionGrade(s).pct).toBe(50);
  });
});
