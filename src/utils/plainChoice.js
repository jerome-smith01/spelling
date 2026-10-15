/**
 * Level 1 for words without lesson letters: hide one or two letters and offer a few choices for each.
 * Pure and deterministic (seeded by the word), so a card keeps the same blanks and choices
 * when it re-renders, and the same word always gets the same exercise.
 */

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz'.split('');
// Look-alike or sound-alike letters, offered first so the wrong choices are believable
const CONFUSABLE = {
  b: ['d', 'p'], d: ['b', 't'], p: ['q', 'b'], q: ['p', 'g'], m: ['n', 'w'], n: ['m', 'h'],
  s: ['c', 'z'], c: ['k', 's'], k: ['c', 'g'], f: ['v', 'p'], v: ['f', 'w'], g: ['j', 'q'],
  j: ['g', 'y'], t: ['d', 'f'], w: ['m', 'v'], y: ['j', 'i'], l: ['i', 'r'], r: ['l', 'n']
};

/** Small seeded generator (mulberry32) so the same word always makes the same picks. */
function rngFor(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (list, rand) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** The correct letter plus three believable wrong ones, in a stable shuffled order. */
export function optionsFor(letter, rand) {
  const ch = letter.toLowerCase();
  const isVowel = VOWELS.includes(ch);
  const pool = isVowel ? VOWELS : CONSONANTS;
  const wrong = [];
  if (!isVowel) for (const c of CONFUSABLE[ch] || []) if (c !== ch && !wrong.includes(c)) wrong.push(c);
  for (const c of shuffled(pool, rand)) {
    if (wrong.length >= 3) break;
    if (c !== ch && !wrong.includes(c)) wrong.push(c);
  }
  return shuffled([ch, ...wrong.slice(0, 3)], rand);
}

/**
 * Blanks for a plain word: one letter (two for words of 6+ letters), never the first letter,
 * vowels first since those are the ones students mix up. Returns [{ group, start, end, options }]
 * in the same shape as smartHide's findTargets, plus the choices for each blank.
 */
export function buildPlainPick(word) {
  const w = String(word || '').toLowerCase();
  const rand = rngFor(w);
  const letters = [...w].map((ch, i) => ({ ch, i })).filter(l => /[a-z]/.test(l.ch));
  if (letters.length === 0) return [];
  const wanted = letters.length >= 6 ? 2 : 1;
  const inner = letters.filter(l => l.i > 0);
  const pickFrom = inner.length ? inner : letters;
  const vowels = pickFrom.filter(l => VOWELS.includes(l.ch));
  const chosen = [];
  const take = (list) => {
    for (const l of shuffled(list, rand)) {
      if (chosen.length >= wanted) return;
      if (chosen.every(c => Math.abs(c.i - l.i) > 1)) chosen.push(l);
    }
  };
  take(vowels);
  take(pickFrom);
  if (chosen.length === 0) chosen.push(pickFrom[0]);
  return chosen
    .sort((a, b) => a.i - b.i)
    .map(l => ({ group: l.ch, start: l.i, end: l.i + 1, options: optionsFor(l.ch, rand) }));
}
