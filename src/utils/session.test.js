import { describe, it, expect } from 'vitest';
import { makeSession, currentWord, recordResult, recordSkip, advance, goTo, endEarly, isComplete } from './session';

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
