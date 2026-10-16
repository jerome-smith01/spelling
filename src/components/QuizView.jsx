import React, { useEffect, useRef, useState } from 'react';
import { alignSpelling, alignCells } from '../utils/schedule';
import { useTutorial } from '../hooks/useTutorial';
import { QUIZ_STEPS, TUTORIAL_KEYS } from '../utils/tutorialSteps';
import useCoarsePointer from '../hooks/useCoarsePointer';
import VirtualKeyboard from './VirtualKeyboard';
import KeyboardFrame from './KeyboardFrame';
import ReviewModal from './ReviewModal';
import useReviewGate from '../hooks/useReviewGate';
import { cellsFromSpelling } from '../utils/reviewCells';
import SpellingResult, { cellsOf } from './SpellingResult';
import RoundSummary from './RoundSummary';
import useDrill from '../hooks/useDrill';
import { TaskAltIcon, ChevronRightIcon, CloseIcon, CheckIcon } from './ActionIcons';
import { PlayIcon, SlowPlayIcon, BothSpeedIcon } from './AudioIcons';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import { letterFor } from '../utils/session';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Quiz progress survives a refresh: saved per list (and learner) under `storageKey`
const loadSaved = (storageKey, words) => {
  if (!storageKey) return null;
  try {
    const v = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!v || !Array.isArray(v.order) || !Array.isArray(v.outcomes)) return null;
    const byWord = new Map(words.map(w => [w.word, w]));
    const order = v.order.map(w => byWord.get(w));
    if (order.some(w => !w) || v.idx > order.length) return null;
    return { order, idx: v.idx | 0, text: typeof v.text === 'string' ? v.text : '', result: v.result || null, outcomes: v.outcomes,
      base: Array.isArray(v.base) ? v.base : null, drilled: Array.isArray(v.drilled) ? v.drilled : [] };
  } catch {
    return null; // storage unavailable or corrupt: start fresh
  }
};

// The last speed the student chose (normal, slow, or both) is what plays automatically on each new word
const SPEED_KEY = 'spelling_tutor_quiz_speed_v1';
const loadSpeed = () => {
  try { const v = localStorage.getItem(SPEED_KEY); return v === 'slow' || v === 'both' ? v : 'normal'; } catch { return 'normal'; }
};

/**
 * Quiz mode: the word is spoken, nothing is shown, the student types it.
 * 100% tests the word out (mastered). A miss changes nothing.
 */
export default function QuizView({ words, isMastered = () => false, onSpeak, onSpeakSyllables, onSpeakBoth, onAttempts, commitQuiz, onExit, keyboardHidden = false, storageKey = null, historyFor = () => [] }) {
  const [saved] = useState(() => loadSaved(storageKey, words));
  const [order, setOrder] = useState(() => saved?.order ?? shuffle(words.filter(w => !isMastered(w.word)))); // fixed for each round
  const [idx, setIdx] = useState(saved?.idx ?? 0);
  const [text, setText] = useState(saved?.text ?? '');
  const [result, setResult] = useState(saved?.result ?? null);
  const [outcomes, setOutcomes] = useState(saved?.outcomes ?? []);
  // The original round's scores, and the words already drilled from it (hardest 3, next 3, ...)
  const { base, drilled, apply: applyDrill } = useDrill({ base: saved?.base, drilled: saved?.drilled });
  const inputRef = useRef(null);
  const [speed, setSpeedState] = useState(loadSpeed);
  const speedRef = useRef(speed);
  const chooseSpeed = (v) => {
    speedRef.current = v;
    setSpeedState(v);
    try { localStorage.setItem(SPEED_KEY, v); } catch { /* storage unavailable */ }
  };
  const mobile = useCoarsePointer();
  const word = order[idx];
  const listId = storageKey ? storageKey.split(':').pop() : null;
  const gate = useReviewGate({ context: 'quiz', listId });
  const tutorial = useTutorial();

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ order: order.map(w => w.word), idx, text, result, outcomes, base, drilled }));
    } catch { /* storage unavailable */ }
  }, [storageKey, order, idx, text, result, outcomes, base, drilled]);

  const exit = () => {
    if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* storage unavailable */ } }
    onExit();
  };

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

  const syl = () => buildPronunciationSyllables(word);
  const playNormal = () => { chooseSpeed('normal'); onSpeak(word.id, word.word); };
  const playSlow = () => { chooseSpeed('slow'); onSpeakSyllables(word.id, syl()); };
  const playBoth = () => { chooseSpeed('both'); onSpeakBoth(word.id, word.word, syl()); };
  const autoSpeak = () => {
    const v = speedRef.current;
    if (v === 'slow' && onSpeakSyllables) onSpeakSyllables(word.id, syl());
    else if (v === 'both' && onSpeakBoth) onSpeakBoth(word.id, word.word, syl());
    else onSpeak(word.id, word.word);
  };

  // Speak each new word (small delay so the previous utterance is canceled cleanly)
  useEffect(() => {
    if (!word) return undefined;
    const t = setTimeout(() => autoSpeak(), 350);
    if (!mobile) inputRef.current?.focus();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, order]);

  const next = () => {
    setResult(null);
    setText('');
    setIdx(i => i + 1);
  };

  // Leaving a missed word too fast opens the review popup instead (useReviewGate)
  const nextWord = () => gate.guard(next);

  // Tell the gate when a result is on screen (also when one is restored after a refresh)
  useEffect(() => {
    if (result && word) gate.show({ word: word.word, correct: result.pct >= 100, cells: cellsFromSpelling(result.typed, word.word) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Once a word is checked, Enter means "next word", wherever focus happens to be
  useEffect(() => {
    if (!result) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.repeat) return;
      e.preventDefault();
      nextWord();
    };
    // Registered a tick late: the Enter that just checked the word is still travelling to the window,
    // and must not also count as "next word"
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 0);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, idx]);

  // mode: 'drill' picks from the original round (kept), 'keep' retakes within a drill, 'reset' starts afresh
  const start = (list, mode = 'reset') => {
    gate.reset();
    applyDrill(list, mode, outcomes.map(o => ({ word: o.word, ok: o.testedOut, pct: o.pct })));
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
    const avg = done ? Math.round(outcomes.reduce((a, o) => a + o.pct, 0) / outcomes.length) : 0;
    return (
      <div className="quiz-immersive quiz-summary">
        <div className="quiz-top">
          <span />
          <button type="button" className="btn-secondary-sm" onClick={exit} aria-label="Exit quiz"><CloseIcon /> Exit</button>
        </div>
        <div className="quiz-stage">
          <RoundSummary
            subject="Quiz"
            gradeTitle="Quiz grade"
            grade={{ letter: letterFor(avg), pct: avg }}
            headline={`Tested out of ${out} of ${outcomes.length} ${outcomes.length === 1 ? 'word' : 'words'}`}
            outcomes={outcomes.map(o => ({ word: o.word, ok: o.testedOut, pct: o.pct, typed: o.typed, cells: o.cells }))}
            words={words}
            isMastered={isMastered}
            historyFor={historyFor}
            base={base}
            drilled={drilled}
            onStart={start}
            onFinish={exit}
            onBack={exit}
          />
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!text.trim() || result) return;
    const { matched, typedMatched, pct } = alignSpelling(text, word.word);
    const cells = alignCells(text, word.word);
    const typed = text.trim().toLowerCase();
    onAttempts?.(word.word, matched.map((ok, i) => ({
      letter: word.word[i], position: i, correct: ok ? 1 : 0, typed: ok ? word.word[i] : (typed[i] || '')
    })));
    const r = commitQuiz(word.word, pct);
    setResult({ pct, testedOut: r.testedOut, unlearned: !!r.unlearned, matched, typedMatched, cells, typed: text.trim() });
    setOutcomes(o => [...o, { word: word.word, testedOut: r.testedOut, pct, matched, typedMatched, cells, typed: text.trim() }]);
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || result) return; // with a result showing, the window handler below moves on
    e.preventDefault();
    submit();
  };

  const typedWord = result?.typed || '';
  const keyboardEnter = () => { if (gate.modal) gate.keyRef.current?.enter?.(); else if (result) nextWord(); else submit(); };

  return (
    <div className="quiz-immersive" onKeyDown={onKeyDown}>
      <div className="quiz-top">
        <div className="deck-strip session" role="list" aria-label="Quiz words">
          {order.map((w, i) => {
            const o = outcomes[i];
            const st = o ? (o.testedOut ? 'ok' : 'miss') : '';
            const isCurrent = i === idx;
            return (
              <span
                key={w.word + i}
                role="listitem"
                className={`sess-dot ${st} ${isCurrent ? 'current' : ''}`}
                aria-label={`Word ${i + 1} of ${order.length}: ${isCurrent ? 'current' : o ? (o.testedOut ? 'tested out' : 'missed') : 'not reached yet'}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {st === 'ok' ? <CheckIcon /> : st === 'miss' ? <CloseIcon /> : null}
              </span>
            );
          })}
        </div>
        <button type="button" className="btn-secondary-sm" onClick={exit} aria-label="Exit quiz"><CloseIcon /> Exit</button>
      </div>
      <div className="quiz-stage">
        {!result ? (
          <>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }} data-tutorial="quiz-audio">
              <button
                type="button"
                className={`speaker-btn${speed === 'normal' ? ' is-default' : ''}`}
                style={{ width: '4rem', height: '4rem', fontSize: '1.8rem' }}
                onClick={playNormal}
                aria-label="Hear the word again"
              >
                <PlayIcon size="1.5em" />
              </button>
              {onSpeakSyllables && (
                <button
                  type="button"
                  className={`speaker-btn${speed === 'slow' ? ' is-default' : ''}`}
                  style={{ width: '4rem', height: '4rem', fontSize: '1.8rem' }}
                  onClick={playSlow}
                  aria-label="Hear the word syllable by syllable"
                >
                  <SlowPlayIcon size="1.5em" />
                </button>
              )}
              {onSpeakBoth && (
                <button
                  type="button"
                  className={`speaker-btn speaker-btn-both${speed === 'both' ? ' is-default' : ''}`}
                  style={{ height: '4rem', fontSize: '1.8rem' }}
                  onClick={playBoth}
                  aria-label="Hear the word at normal speed, then slowly"
                >
                  <BothSpeedIcon size="1em" />
                </button>
              )}
            </div>
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
          <SpellingResult cells={cellsOf(result.cells, typedWord, word.word)} word={word.word} typed={typedWord} correct={result.pct === 100} />
        )}
      </div>
      {mobile && keyboardHidden ? null : mobile ? (
        <KeyboardFrame>
        <VirtualKeyboard
          onChar={(c) => { if (gate.modal) gate.keyRef.current?.press(c); else if (!result) setText(t => t + c); }}
          onBackspace={() => { if (!gate.modal && !result) setText(t => t.slice(0, -1)); }}
          onEnter={keyboardEnter}
          enterDisabled={!result && !text.trim()}
          enterLabel={result ? (idx + 1 < order.length ? 'Next word' : 'See results') : 'Check'}
          defaultSpeed={speed}
          onPlay={result ? undefined : playNormal}
          onPlaySlow={result || !onSpeakSyllables ? undefined : playSlow}
          onPlayBoth={result || !onSpeakBoth ? undefined : playBoth}
        />
        </KeyboardFrame>
      ) : (
        <div className="quiz-actions">
          {result ? (
            <button type="button" className="btn-verify" onClick={nextWord} autoFocus>
              {idx + 1 < order.length ? 'Next word' : 'See results'} <ChevronRightIcon />
            </button>
          ) : (
            <button type="button" className="btn-verify" onClick={submit} disabled={!text.trim()}><TaskAltIcon /> Check</button>
          )}
        </div>
      )}
      <ReviewModal gate={gate} hasKeyboard={mobile && !keyboardHidden} />
    </div>
  );
}
