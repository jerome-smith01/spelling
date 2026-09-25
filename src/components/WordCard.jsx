import React, { useState, useRef, useEffect } from 'react';
import SyllableBlock from './SyllableBlock';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';

export default function WordCard({
  word,
  hiddenIndices = new Set(),
  onHide,
  onShow,
  onSpeak,
  onSpeakSyllables,
  activePlayback
}) {
  const [userInputs, setUserInputs] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const inputRefs = useRef({});

  // Active speech playback states
  const isCardSpeakingSlow = activePlayback?.wordId === word.id && activePlayback?.isSlow;
  const isCardSpeakingNormal = activePlayback?.wordId === word.id && !activePlayback?.isSlow;
  const activeSyllableIndex = isCardSpeakingSlow ? activePlayback.activeSyllableIndex : null;

  // Clear inputs and validation results when hidden configuration changes
  useEffect(() => {
    setUserInputs({});
    setValidationResults(null);
  }, [hiddenIndices]);

  // Ordered list of hidden global indices for auto-advance/backspace sequence
  const hiddenSequence = Array.from({ length: word.letterCount }, (_, i) => i)
    .filter(i => hiddenIndices.has(i));

  const handleInputChange = (index, char) => {
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
    let allCorrect = true;

    // Flatten word letters for easy indexing
    const letters = word.syllables.flat();

    for (const idx of hiddenSequence) {
      const typed = (userInputs[idx] || '').trim().toLowerCase();
      const actual = letters[idx]?.char.toLowerCase();

      if (typed && typed === actual) {
        results[idx] = 'correct';
      } else {
        results[idx] = 'incorrect';
        allCorrect = false;
      }
    }

    setValidationResults(results);
  };

  const hasHidden = hiddenIndices.size > 0;
  const isAllCorrect = validationResults && Object.values(validationResults).every(v => v === 'correct');

  return (
    <article className="word-card" aria-label={`Spelling card for ${word.word}`}>
      {/* Header: Pronunciation & Word info */}
      <div className="word-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
      />

      {/* Footer Controls: Hide, Show, and Verify Button */}
      <div className="word-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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

        {hasHidden && (
          <button
            type="button"
            onClick={handleVerify}
            className="btn-verify"
            aria-label={`Check your spelling for ${word.word}`}
          >
            Check
          </button>
        )}
      </div>
    </article>
  );
}
