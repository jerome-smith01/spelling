import React, { useEffect, useRef, useState } from 'react';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';

/**
 * Smart-hiding level 1: the lesson's letters are blank and the student picks
 * which group fills each blank (choices = the list's own focus groups only).
 * Graded like a hidden-letter attempt; `typed` is the chosen group's letter at
 * each position so friction and pattern stats keep working.
 */
export default function ChoicePicker({
  word, targets, groups, onSpeak, onSpeakSyllables, activePlayback, onAttempts, onResult, autoFocus = false
}) {
  const [picks, setPicks] = useState({}); // target index -> chosen group
  const firstRef = useRef(null);
  const speakingNormal = activePlayback?.wordId === word.id && !activePlayback?.isSlow;
  const speakingSlow = activePlayback?.wordId === word.id && activePlayback?.isSlow;

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const owner = new Map(); // letter index -> target index
  targets.forEach((t, ti) => { for (let i = t.start; i < t.end; i++) owner.set(i, ti); });
  const allPicked = targets.every((_, ti) => picks[ti]);

  const check = () => {
    if (!allPicked) return;
    const letters = word.syllables.flat();
    const results = {};
    const typed = {};
    const attempts = [];
    targets.forEach((t, ti) => {
      const chosen = picks[ti];
      for (let i = t.start; i < t.end; i++) {
        const actual = letters[i].char.toLowerCase();
        const got = chosen[i - t.start] || '';
        const ok = chosen === t.group;
        results[i] = ok ? 'correct' : 'incorrect';
        typed[i] = got;
        attempts.push({ letter: actual, position: i, correct: ok ? 1 : 0, typed: got });
      }
    });
    onAttempts?.(word.word, attempts);
    const correct = attempts.filter(a => a.correct).length;
    onResult?.({ pct: Math.round((correct / attempts.length) * 100), results, typed });
  };

  return (
    <article className="word-card" aria-label={`Spelling card for ${word.word}`}>
      <div className="word-card-header">
        <div data-tutorial="audio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button type="button" className={`speaker-btn ${speakingNormal ? 'active' : ''}`}
            onClick={() => onSpeak(word.id, word.word)}
            aria-label={speakingNormal ? `Stop audio for ${word.word}` : `Hear ${word.word} at normal speed`}>
            {speakingNormal ? '⏹️' : '🔊'}
          </button>
          <button type="button" className={`speaker-btn ${speakingSlow ? 'active' : ''}`}
            onClick={() => onSpeakSyllables?.(word.id, buildPronunciationSyllables(word))}
            aria-label={speakingSlow ? `Stop audio for ${word.word}` : `Hear ${word.word} syllable by syllable`}>
            {speakingSlow ? '⏹️' : '🐢'}
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
          Pick the missing letters
        </span>
      </div>

      <div className="syllables-wrapper" data-tutorial="blanks">
        {word.syllables.map((syl, si) => (
          <React.Fragment key={si}>
            <div className="syllable-group">
              {syl.map(l => {
                const ti = owner.get(l.index);
                if (ti === undefined) return <div key={l.index} className="letter-box">{l.char}</div>;
                const t = targets[ti];
                const chosen = picks[ti];
                return (
                  <div key={l.index} className="letter-box choice-blank" aria-hidden="true">
                    {chosen ? (chosen[l.index - t.start] || '') : '?'}
                  </div>
                );
              })}
            </div>
            {si < word.syllables.length - 1 && <span className="syllable-separator" aria-hidden="true">&bull;</span>}
          </React.Fragment>
        ))}
      </div>

      {targets.map((t, ti) => (
        <div key={ti} className="choice-row" role="group"
          aria-label={targets.length > 1 ? `Choose the letters for blank ${ti + 1}` : 'Choose the missing letters'}>
          {groups.map((g, gi) => (
            <button
              key={g}
              ref={ti === 0 && gi === 0 ? firstRef : undefined}
              type="button"
              className="choice-btn"
              aria-pressed={picks[ti] === g}
              onClick={() => setPicks(p => ({ ...p, [ti]: g }))}
            >
              {g}
            </button>
          ))}
        </div>
      ))}

      <div className="word-card-footer" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn-verify" onClick={check} disabled={!allPicked}
          aria-label={`Check your answer for ${word.word}`}>
          Check
        </button>
      </div>
    </article>
  );
}
