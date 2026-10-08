import React, { useEffect, useRef, useState } from 'react';
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
export default function QuizView({ words, isMastered = () => false, onSpeak, onAttempts, commitQuiz, onExit }) {
  const [order, setOrder] = useState(() => shuffle(words.filter(w => !isMastered(w.word)))); // fixed for each round
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
  }, [idx, order]);

  const start = (list) => {
    setOrder(shuffle(list));
    setIdx(0);
    setOutcomes([]);
    setResult(null);
    setText('');
  };

  // Pick what to quiz on: shown before the first round (if nothing is open) and after each round
  if (!word) {
    const done = outcomes.length > 0;
    const out = outcomes.filter(o => o.testedOut).length;
    const missed = outcomes.filter(o => !o.testedOut);
    const missedSet = new Set(missed.map(o => o.word));
    const choices = [
      { key: 'missed', label: 'Missed words', list: words.filter(w => missedSet.has(w.word)) },
      { key: 'open', label: 'Not yet mastered', list: words.filter(w => !isMastered(w.word)) },
      { key: 'all', label: 'All words, including mastered', list: words }
    ].filter(c => c.list.length > 0);
    return (
      <div className="quiz-immersive">
        <div className="quiz-top">
          <span />
          <button type="button" className="btn-secondary-sm" onClick={onExit} aria-label="Exit quiz">✕ Exit</button>
        </div>
        <div className="quiz-stage">
          {done ? (
            <>
              <div style={{ fontSize: '2.5rem' }}>📝</div>
              <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
                Tested out of {out} of {outcomes.length} {outcomes.length === 1 ? 'word' : 'words'}
              </p>
              {missed.length > 0 && (
                <p className="deck-message" style={{ margin: 0 }}>
                  Still to practice: {missed.map(o => o.word).join(', ')}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontWeight: 700, margin: 0 }}>Every word is already mastered. 🎉</p>
          )}
          <p className="quiz-label" style={{ margin: 0 }}>{done ? 'Quiz again' : 'Quiz anyway'}: what to focus on?</p>
          {choices.map(c => (
            <button key={c.key} type="button" className="btn-verify" onClick={() => start(c.list)}>
              {c.key === 'missed' && c.list.length === 1 ? 'Missed word (1)' : `${c.label} (${c.list.length})`}
            </button>
          ))}
          <button type="button" className="btn-secondary-sm" onClick={onExit}>Back to practice</button>
        </div>
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
    setResult({ pct, testedOut: r.testedOut, matched, typed: text.trim() });
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

  const typedWord = result?.typed || '';
  const keyboardEnter = result ? next : submit;

  return (
    <div className="quiz-immersive" onKeyDown={onKeyDown}>
      <div className="quiz-top">
        <div className="deck-badge">Word {idx + 1} of {order.length}</div>
        <button type="button" className="btn-secondary-sm" onClick={onExit} aria-label="Exit quiz">✕ Exit</button>
      </div>
      <div className="quiz-stage">
        {!result ? (
          <>
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
          </>
        ) : (
          <div className="quiz-result" aria-live="polite">
            {result.pct === 100 ? (
              <div className="quiz-answer quiz-right" aria-label={`Correct: ${word.word}`}>{word.word}</div>
            ) : (
              <fieldset className="quiz-compare">
                <legend>Incorrect</legend>
                <div className="quiz-label">You spelled</div>
                <div className="quiz-answer quiz-wrong">{typedWord}</div>
                <div className="quiz-label">Correct spelling</div>
                <div className="quiz-answer quiz-right" aria-label={`The word is ${word.word}`}>{word.word}</div>
              </fieldset>
            )}
            <p className="deck-message" style={{ margin: 0 }}>
              {result.testedOut
                ? '✓ Tested out! This word is mastered.'
                : 'Not quite. No penalty, it stays at its current level.'}
            </p>
          </div>
        )}
      </div>
      {mobile ? (
        <VirtualKeyboard
          onChar={(c) => { if (!result) setText(t => t + c); }}
          onBackspace={() => { if (!result) setText(t => t.slice(0, -1)); }}
          onEnter={keyboardEnter}
          enterDisabled={!result && !text.trim()}
          enterLabel={result ? (idx + 1 < order.length ? 'Next word' : 'See results') : 'Check'}
        />
      ) : (
        <div className="quiz-actions">
          {result ? (
            <button type="button" className="btn-verify" onClick={next} autoFocus>
              {idx + 1 < order.length ? 'Next word' : 'See results'}
            </button>
          ) : (
            <button type="button" className="btn-verify" onClick={submit} disabled={!text.trim()}>Check</button>
          )}
        </div>
      )}
    </div>
  );
}
