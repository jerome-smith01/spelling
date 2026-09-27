import { describe, it, expect } from 'vitest';
import { applyPhoneticRules, buildPronunciationSyllables } from './syllablePhonetics';

function wordFromSyllables(word, syllableStrings) {
  return {
    word,
    syllables: syllableStrings.map(s => s.split('').map(char => ({ char })))
  };
}

describe('applyPhoneticRules', () => {
  it('turns trailing y after a consonant into "ee" (puppy: py -> pee, not pie)', () => {
    expect(applyPhoneticRules('py')).toBe('pee');
  });

  it('turns -tion into shun', () => {
    expect(applyPhoneticRules('tion')).toBe('shun');
  });

  it('turns consonant+le into consonant+ul', () => {
    expect(applyPhoneticRules('ble')).toBe('bul');
  });
});

describe('buildPronunciationSyllables', () => {
  it('produces "pup", "pee" for puppy via the auto-rule (no override needed)', () => {
    const word = wordFromSyllables('puppy', ['pup', 'py']);
    expect(buildPronunciationSyllables(word)).toEqual(['pup', 'pee']);
  });

  it('prefers an explicit teacher-provided override when the syllable count matches', () => {
    const word = wordFromSyllables('pretty', ['pret', 'ty']);
    word.pronunciationSyllables = ['prit', 'tee'];
    expect(buildPronunciationSyllables(word)).toEqual(['prit', 'tee']);
  });

  it('falls back to the built-in irregular word map when no override is given', () => {
    const word = wordFromSyllables('handsome', ['hand', 'some']);
    expect(buildPronunciationSyllables(word)).toEqual(['hand', 'sum']);
  });
});
