import { describe, expect, it } from 'vitest';
import { frictionByWord, wordFriction, toFinalAnswers } from './friction';

const a = (word, position, correct, session, id) => ({ word, position, correct, session_id: session, client_id: id });

describe('friction (client)', () => {
  it('a miss corrected within the same session counts as correct', () => {
    expect(toFinalAnswers([a('cat', 1, 0, 's1', 1), a('cat', 1, 1, 's1', 2)])[0].correct).toBe(true);
    expect(wordFriction([a('cat', 1, 0, 's1', 1), a('cat', 1, 1, 's1', 2)], 'cat')).toBe(0);
  });

  it('consecutive misses across sessions escalate 10, 20, 30', () => {
    const q = [a('cat', 1, 0, 's1', 1), a('cat', 1, 0, 's2', 2), a('cat', 1, 0, 's3', 3)];
    expect(wordFriction(q, 'cat')).toBe(60);
  });

  it('attempts without a session each stand alone', () => {
    expect(wordFriction([a('cat', 1, 0, undefined, 1), a('cat', 1, 0, undefined, 2)], 'cat')).toBe(30);
  });

  it('three perfect sessions in a row master the word and wipe its history', () => {
    const perfect = s => [0, 1, 2].map(i => a('cat', i, 1, s, `${s}${i}`));
    const q = [a('cat', 1, 0, 's0', 90), a('cat', 1, 0, 's00', 91), ...perfect('s1'), ...perfect('s2'), ...perfect('s3')];
    expect(wordFriction(q, 'cat')).toBe(0);
    // a later miss starts fresh
    expect(wordFriction([...q, a('cat', 1, 0, 's4', 99)], 'cat')).toBe(10);
  });

  it('groups by word', () => {
    expect(frictionByWord([a('cat', 1, 0, 's1', 1), a('dog', 0, 1, 's1', 2)])).toEqual({ cat: 10, dog: 0 });
  });
});
