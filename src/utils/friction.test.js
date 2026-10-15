import { describe, expect, it } from 'vitest';
import { frictionByWord, wordFriction, toSessionAnswers } from './friction';

const a = (word, position, correct, session, id) => ({ word, position, correct, session_id: session, client_id: id });

describe('friction (client)', () => {
  it('a miss corrected later in the same session still counts as a miss', () => {
    const [ans] = toSessionAnswers([a('cat', 1, 0, 's1', 1), a('cat', 1, 1, 's1', 2)]);
    expect(ans).toMatchObject({ correct: false, misses: 1 });
    expect(wordFriction([a('cat', 1, 0, 's1', 1), a('cat', 1, 1, 's1', 2)], 'cat')).toBe(10);
  });

  it('the same letter missed again in a session weighs more (10 x misses squared)', () => {
    const twice = [a('cat', 1, 0, 's1', 1), a('cat', 1, 0, 's1', 2), a('cat', 1, 1, 's1', 3)];
    expect(wordFriction(twice, 'cat')).toBe(40);
    const thrice = [1, 2, 3].map(id => a('cat', 1, 0, 's1', id));
    expect(wordFriction(thrice, 'cat')).toBe(90);
  });

  it('three different letters missed once each is less than one letter missed twice', () => {
    const spread = [a('cat', 0, 0, 's1', 1), a('cat', 1, 0, 's1', 2), a('cat', 2, 0, 's1', 3)];
    expect(wordFriction(spread, 'cat')).toBe(30);
  });

  it('a clean session takes 5 off per letter, floor 0', () => {
    expect(wordFriction([a('cat', 1, 0, 's1', 1), a('cat', 1, 1, 's2', 2)], 'cat')).toBe(5);
    expect(wordFriction([a('cat', 1, 1, 's1', 1)], 'cat')).toBe(0);
  });

  it('attempts without a session each stand alone', () => {
    expect(wordFriction([a('cat', 1, 0, undefined, 1), a('cat', 1, 0, undefined, 2)], 'cat')).toBe(20);
  });

  it('a session with a corrected miss is not perfect for mastery', () => {
    // each visit: 'c' missed twice then fixed (+40), 'a' and 't' clean (-10) = 30
    const fixed = s => [a('cat', 0, 0, s, `${s}x`), a('cat', 0, 0, s, `${s}y`), ...[0, 1, 2].map(i => a('cat', i, 1, s, `${s}${i}`))];
    expect(wordFriction([...fixed('s1'), ...fixed('s2'), ...fixed('s3')], 'cat')).toBe(90);
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
