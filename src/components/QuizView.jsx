import React, { useEffect, useMemo, useRef, useState } from 'react';
import { alignSpelling } from '../utils/schedule';
import { useTutorial } from '../hooks/useTutorial';
import { QUIZ_STEPS, TUTORIAL_KEYS } from '../utils/tutorialSteps';
import useCoarsePointer from '../hooks/useCoarsePointer';
import VirtualKeyboard from './VirtualKeyboard';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Quiz mode: the word is spoken, nothing is shown, the student types it.
 * 100% tests the word out (mastered). A miss changes nothing.
 */
export default function QuizView({ words, onSpeak, onAttempts, commitQuiz, onExit }) {
  const order = useMemo(() => shuffle(words), []); // fixed for the whole quiz
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const inputRef = useRef(null);
  const mobile = useCoarsePointer();
  const word = order[idx];
  const tutorial = useTutorial();

  // First quiz: explain listen-and-spell (only steps whose target is on screen)
  useEffect(() => {
    const t = setTimeout(() => {
      tutorial.checkAndStart(TUTORIAL_KEYS.quiz, QUIZ_STEPS, {
        isAvailable: (st) => !!document.querySelector(`[data-tutorial="${st.target}"]`)
      });
    }, 700);
    return () => { clearTimeout(t); tutorial.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorial.decided, tutorial.enabled]);

  // Speak each new word (small delay so the previous utterance is cancelled cleanly)
  useEffect(() => {
    if (!word) return undefined;
    const t = setTimeout(() => onSpeak(word.id, word.word), 350);
    if (!mobile) inputRef.current?.focus();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (order.length === 0) {
    return (
      <div className="deck-card-center">
        <p style={{ fontWeight: 700, margin: 0 }}>Every word is already mastered. 🎉</p>
        <button type="button" className="btn-verify" onClick={onExit}>Back to practice</button>
      </div>
    );
  }

  if (!word) {
    const out = outcomes.filter(o => o.testedOut).length;
    return (
      <div className="deck-card-center">
        <div style={{ fontSize: '2.5rem' }}>📝</div>
        <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
          Tested out of {out} of {outcomes.length} {outcomes.length === 1 ? 'word' : 'words'}
        </p>
        {outcomes.some(o => !o.testedOut) && (
          <p className="deck-message" style={{ margin: 0 }}>
            Still to practice: {outcomes.filter(o => !o.testedOut).map(o => o.word).join(', ')}
          </p>
        )}
        <button type="button" className="btn-verify" onClick={onExit}>Back to practice</button>
      </div>
    );
  }

  const submit = () => {
    if (!text.trim() || result) return;
    const { matched, pct } = alignSpelling(text, word.word);
    const typed = text.trim().toLowerCase();
    onAttempts?.(word.word, matched.map((ok, i) => ({
      letter: word.word[i], position: i, correct: ok ? 1 : 0, typed: ok ? word.word[i] : (typed[i] || '')
    })));
    const r = commitQuiz(word.word, pct);
    setResult({ pct, testedOut: r.testedOut, matched });
    setOutcomes(o => [...o, { word: word.word, testedOut: r.testedOut }]);
  };

  const next = () => {
    setResult(null);
    setText('');
    setIdx(i => i + 1);
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (result) next(); else submit();
  };

  return (
    <div className="deck-card-center" onKeyDown={onKeyDown}>
      <div className="deck-badge">Quiz · word {idx + 1} of {order.length}</div>
      {!result ? (
        <>
          <p className="deck-message" style={{ margin: 0 }}>Listen, then spell the word.</p>
          <button
            type="button"
            className="speaker-btn"
            data-tutorial="quiz-audio"
            style={{ width: '4rem', height: '4rem', fontSize: '1.8rem' }}
            onClick={() => onSpeak(word.id, word.word)}
            aria-label="Hear the word again"
          >
            🔊
          </button>
          <input
            ref={inputRef}
            className="quiz-input"
            data-tutorial="quiz-input"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^a-zA-Z' -]/g, ''))}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            readOnly={mobile}
            inputMode={mobile ? 'none' : undefined}
            aria-label="Type the word you heard"
          />
          {mobile ? (
            <VirtualKeyboard
              onChar={(c) => setText(t => t + c)}
              onBackspace={() => setText(t => t.slice(0, -1))}
              onEnter={submit}
              enterDisabled={!text.trim()}
            />
          ) : (
            <button type="button" className="btn-verify" onClick={submit} disabled={!text.trim()}>Check</button>
          )}
        </>
      ) : (
        <>
          <div className="deck-back-word" aria-label={`The word is ${word.word}`}>
            {word.word.split('').map((ch, i) => (
              <div key={i} className={`letter-box ${result.matched[i] ? 'correct' : 'incorrect'}`}>{ch}</div>
            ))}
          </div>
          <div className="deck-score">{result.pct}%</div>
          <p className="deck-message" style={{ margin: 0 }}>
            {result.testedOut
              ? '✓ Tested out! This word is mastered.'
              : 'Not quite. No penalty, it stays at its current level.'}
          </p>
          <button type="button" className="btn-verify" onClick={next} autoFocus>
            {idx + 1 < order.length ? 'Next word' : 'See results'}
          </button>
        </>
      )}
    </div>
  );
}
