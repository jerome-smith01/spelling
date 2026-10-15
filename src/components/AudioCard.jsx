import React, { useEffect, useRef, useState } from 'react';
import AutoplayToggle from './AutoplayToggle';
import { PlayIcon, SlowPlayIcon, BothSpeedIcon } from './AudioIcons';
import { ChevronLeftIcon, ChevronRightIcon, TaskAltIcon } from './ActionIcons';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import { alignSpelling } from '../utils/schedule';

/**
 * Level 5, the audio quiz: nothing about the word is shown. The student listens and types it.
 * Graded like the Quiz tab (letters lined up against the answer), but it moves the word through
 * the levels like any other card, so passing it learns the word.
 */
export default function AudioCard({
  word, onSpeak, onSpeakSyllables, onSpeakBoth, activePlayback, onAttempts, onResult,
  autoFocus = false, keyboardRef = null, onCanCheck, onBack, onSkip, canBack = false,
  autoPlay, onAutoPlayChange, touchKeyboard = false
}) {
  const [text, setText] = useState('');
  const textRef = useRef('');
  const inputRef = useRef(null);
  const speakingNormal = activePlayback?.wordId === word.id && !activePlayback?.isSlow;
  const speakingSlow = activePlayback?.wordId === word.id && activePlayback?.isSlow;

  const update = (next) => { textRef.current = next; setText(next); };

  useEffect(() => {
    if (autoFocus && !touchKeyboard) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus, touchKeyboard]);

  const check = () => {
    const typed = textRef.current.trim().toLowerCase();
    if (!typed) return;
    const answer = word.word;
    const { matched, pct } = alignSpelling(typed, answer);
    const results = {};
    const typedByIndex = {};
    matched.forEach((ok, i) => {
      results[i] = ok ? 'correct' : 'incorrect';
      if (!ok && typed[i]) typedByIndex[i] = typed[i];
    });
    onAttempts?.(answer, matched.map((ok, i) => ({
      letter: answer[i], position: i, correct: ok ? 1 : 0, typed: ok ? answer[i] : (typed[i] || '')
    })));
    onResult?.({ pct, results, typed: typedByIndex });
  };

  if (keyboardRef) {
    keyboardRef.current = {
      press: (c) => update(textRef.current + String(c).toLowerCase().slice(0, 1)),
      backspace: () => update(textRef.current.slice(0, -1)),
      check
    };
  }

  const canCheck = text.trim() !== '';
  useEffect(() => { onCanCheck?.(canCheck); }, [canCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const syllables = () => buildPronunciationSyllables(word);

  return (
    <article className="word-card" aria-label={`Spelling card for ${word.word}`}>
      <div className="word-card-header">
        <div data-tutorial="audio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button type="button" className={`speaker-btn ${speakingNormal ? 'active' : ''}`}
            onClick={() => onSpeak(word.id, word.word)}
            aria-label={speakingNormal ? 'Stop audio' : 'Hear the word at normal speed'}>
            {speakingNormal ? '⏹️' : <PlayIcon />}
          </button>
          <button type="button" className={`speaker-btn ${speakingSlow ? 'active' : ''}`}
            onClick={() => onSpeakSyllables?.(word.id, syllables())}
            aria-label={speakingSlow ? 'Stop audio' : 'Hear the word syllable by syllable'}>
            {speakingSlow ? '⏹️' : <SlowPlayIcon />}
          </button>
          {onSpeakBoth && (
            <button type="button" className="speaker-btn speaker-btn-both"
              onClick={() => onSpeakBoth(word.id, word.word, syllables())}
              aria-label="Hear the word at normal speed, then slowly">
              <BothSpeedIcon size="1em" />
            </button>
          )}
        </div>
        {onAutoPlayChange && <AutoplayToggle checked={autoPlay} onChange={onAutoPlayChange} />}
      </div>

      <p style={{ margin: 0, textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
        Listen, then type the word
      </p>
      <input
        ref={inputRef}
        className="quiz-input"
        style={{ alignSelf: 'center' }}
        value={text}
        onChange={(e) => update(e.target.value.replace(/[^a-zA-Z' -]/g, ''))}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck="false"
        readOnly={touchKeyboard}
        inputMode={touchKeyboard ? 'none' : undefined}
        aria-label="Type the word you heard"
      />

      <div className="word-card-footer">
        <div className="deck-actions">
          <button type="button" className="btn-nav" onClick={onBack} disabled={!canBack}
            aria-label="Back to the previous card">
            <ChevronLeftIcon /><span className="btn-nav-label">Back</span>
          </button>
          <button type="button" className="btn-verify btn-check" onClick={check} disabled={!canCheck}
            aria-label="Check your spelling">
            <TaskAltIcon /> Check
          </button>
          <button type="button" className="btn-nav" onClick={onSkip} aria-label="Skip this card for now">
            <span className="btn-nav-label">Skip</span><ChevronRightIcon />
          </button>
        </div>
      </div>
    </article>
  );
}
