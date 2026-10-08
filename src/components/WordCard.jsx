import React, { useState, useRef, useEffect } from 'react';
import SyllableBlock from './SyllableBlock';
import StruggleIndicator from './StruggleIndicator';
import AITipModal from './AITipModal';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import useCoarsePointer from '../hooks/useCoarsePointer';

export default function WordCard({
  word,
  hiddenIndices = new Set(),
  onHide,
  onShow,
  onSpeak,
  onSpeakSyllables,
  activePlayback,
  onAttempts,
  friction = 0,
  deckMode = false,
  onResult,
  autoFocus = false,
  keyboardRef = null,
  onCanCheck
}) {
  const [userInputs, setUserInputs] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [tipOpen, setTipOpen] = useState(false);
  const inputRefs = useRef({});
  const cardRef = useRef(null);
  const hasScrolledRef = useRef(false);
  // Phones/tablets in the deck type on the app's own keyboard, never the device keyboard
  const coarse = useCoarsePointer();
  const touchKeyboard = deckMode && coarse && !!keyboardRef;
  const activeRef = useRef(null);
  const inputsRef = useRef({});

  // Active speech playback states
  const isCardSpeakingSlow = activePlayback?.wordId === word.id && activePlayback?.isSlow;
  const isCardSpeakingNormal = activePlayback?.wordId === word.id && !activePlayback?.isSlow;
  const activeSyllableIndex = isCardSpeakingSlow ? activePlayback.activeSyllableIndex : null;

  // Clear inputs and validation results when hidden configuration changes
  useEffect(() => {
    setUserInputs({});
    inputsRef.current = {};
    activeRef.current = null;
    setValidationResults(null);
    hasScrolledRef.current = false;
  }, [hiddenIndices]);

  // Deck mode: put the cursor in the first blank so the student can just start typing
  useEffect(() => {
    if (!autoFocus) return;
    const first = Object.keys(inputRefs.current).map(Number).sort((a, b) => a - b)[0];
    if (first !== undefined) inputRefs.current[first]?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Scroll this card to the top of the viewport the first time a letter
  // block is focused, then leave it put — re-scrolling on every keystroke's
  // focus change is what makes the page bounce as a mobile keyboard
  // opens/closes.
  const handleCardFocusIn = () => {
    if (hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  // Ordered list of hidden global indices for auto-advance/backspace sequence
  const hiddenSequence = Array.from({ length: word.letterCount }, (_, i) => i)
    .filter(i => hiddenIndices.has(i));

  const handleInputChange = (index, char) => {
    inputsRef.current = { ...inputsRef.current, [index]: char };
    setUserInputs(prev => ({
      ...prev,
      [index]: char
    }));
    // Clear validation feedback on new typing so student can re-try before checking again
    if (validationResults) {
      setValidationResults(null);
    }
  };

  // Student clicks Check / Verify (Friction button as requested by user)
  const handleVerify = () => {
    if (hiddenSequence.length === 0) return;

    const results = {};
    const attempts = [];
    let allCorrect = true;

    // Flatten word letters for easy indexing
    const letters = word.syllables.flat();

    for (const idx of hiddenSequence) {
      const typed = (userInputs[idx] || '').trim().toLowerCase();
      const actual = letters[idx]?.char.toLowerCase();

      const isCorrect = Boolean(typed) && typed === actual;
      results[idx] = isCorrect ? 'correct' : 'incorrect';
      if (!isCorrect) allCorrect = false;
      attempts.push({ letter: actual, position: idx, correct: isCorrect ? 1 : 0, typed: typed.slice(0, 1) });
    }

    setValidationResults(results);
    // Every Check is recorded (a retry after a miss is the signal the friction score needs)
    if (onAttempts) onAttempts(word.word, attempts);
    if (onResult) {
      const correct = attempts.filter(a => a.correct).length;
      onResult({ pct: Math.round((correct / attempts.length) * 100), results, typed: { ...userInputs } });
    }
  };

  // On-screen keyboard: fill the active blank, then move to the next one
  const focusBlank = (idx) => {
    activeRef.current = idx;
    inputRefs.current[idx]?.focus({ preventScroll: true });
  };
  const activeBlank = () => activeRef.current ?? hiddenSequence.find(i => !inputsRef.current[i]) ?? hiddenSequence[0];
  if (keyboardRef) {
    keyboardRef.current = {
      press: (c) => {
        const idx = activeBlank();
        if (idx === undefined) return;
        handleInputChange(idx, c.toLowerCase().slice(0, 1));
        const next = hiddenSequence[hiddenSequence.indexOf(idx) + 1];
        if (next !== undefined) focusBlank(next);
      },
      backspace: () => {
        let idx = activeBlank();
        if (idx === undefined) return;
        if (!inputsRef.current[idx]) {
          const prev = hiddenSequence[hiddenSequence.indexOf(idx) - 1];
          if (prev === undefined) return;
          idx = prev;
        }
        handleInputChange(idx, '');
        focusBlank(idx);
      },
      check: handleVerify
    };
  }

  const hasHidden = hiddenIndices.size > 0;
  const isAllCorrect = validationResults && Object.values(validationResults).every(v => v === 'correct');
  const allFilled = hasHidden && hiddenSequence.every(idx => (userInputs[idx] || '').trim() !== '');
  useEffect(() => { onCanCheck?.(allFilled); }, [allFilled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <article
      ref={cardRef}
      onFocus={handleCardFocusIn}
      className="word-card"
      aria-label={`Spelling card for ${word.word}`}
      style={isAllCorrect ? {
        backgroundColor: 'var(--selected-color-bg)',
        borderColor: 'var(--selected-color-border)'
      } : undefined}
    >
      {/* Header: Pronunciation & Word info */}
      <div className="word-card-header">
        <div data-tutorial="audio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => onSpeak(word.id, word.word)}
            className={`speaker-btn ${isCardSpeakingNormal ? 'active' : ''}`}
            aria-label={isCardSpeakingNormal ? `Stop audio for ${word.word}` : `Hear ${word.word} at normal speed`}
            title={isCardSpeakingNormal ? 'Stop audio' : `Hear ${word.word} (normal speed)`}
          >
            {isCardSpeakingNormal ? '⏹️' : '🔊'}
          </button>
          <button
            type="button"
            onClick={() => {
              const syllableTexts = buildPronunciationSyllables(word);
              if (onSpeakSyllables) {
                onSpeakSyllables(word.id, syllableTexts);
              }
            }}
            className={`speaker-btn ${isCardSpeakingSlow ? 'active' : ''}`}
            aria-label={isCardSpeakingSlow ? `Stop audio for ${word.word}` : `Hear ${word.word} syllable by syllable`}
            title={isCardSpeakingSlow ? 'Stop audio' : `Hear ${word.word} syllable by syllable`}
          >
            {isCardSpeakingSlow ? '⏹️' : '🐢'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <StruggleIndicator friction={friction} word={word.word} onClick={() => setTipOpen(true)} />
          {isAllCorrect && (
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--selected-color-border)',
              backgroundColor: 'var(--selected-color-bg)',
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px'
            }}>
              ✓ Solved!
            </span>
          )}
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            fontWeight: 600
          }}>
            {word.syllables.length} {word.syllables.length === 1 ? 'syllable' : 'syllables'}
          </span>
        </div>
      </div>

      {/* Syllable Blocks with Letters & Inputs */}
      <SyllableBlock
        syllables={word.syllables}
        hiddenIndices={hiddenIndices}
        userInputs={userInputs}
        validationResults={validationResults}
        onInputChange={handleInputChange}
        inputRefs={inputRefs}
        hiddenSequence={hiddenSequence}
        word={word.word}
        activeSyllableIndex={activeSyllableIndex}
        touchKeyboard={touchKeyboard}
        onActivate={(idx) => { activeRef.current = idx; }}
      />

      {/* Footer Controls: Hide, Show, and Verify Button */}
      <div className="word-card-footer">
        <div style={{ display: deckMode ? 'none' : 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => onHide(word.id, word.letterCount)}
            className="btn-secondary-sm"
            aria-label={`Hide letters in ${word.word}`}
          >
            Hide
          </button>
          <button
            type="button"
            onClick={() => onShow(word.id)}
            className="btn-secondary-sm"
            aria-label={`Show all letters in ${word.word}`}
          >
            Show
          </button>
        </div>

        {hasHidden && !touchKeyboard && (
          <button
            type="button"
            onClick={handleVerify}
            className="btn-verify"
            disabled={!allFilled}
            aria-label={`Check your spelling for ${word.word}`}
            aria-disabled={!allFilled}
          >
            Check
          </button>
        )}
      </div>
      {tipOpen && <AITipModal word={word.word} onClose={() => setTipOpen(false)} />}
    </article>
  );
}
