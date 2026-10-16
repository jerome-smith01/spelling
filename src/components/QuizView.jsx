import React, { useEffect, useRef, useState } from 'react';
import { alignSpelling, recentPct } from '../utils/schedule';
import { useTutorial } from '../hooks/useTutorial';
import { QUIZ_STEPS, TUTORIAL_KEYS } from '../utils/tutorialSteps';
import useCoarsePointer from '../hooks/useCoarsePointer';
import VirtualKeyboard from './VirtualKeyboard';
import KeyboardFrame from './KeyboardFrame';
import { TaskAltIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon, CloseIcon, FlagIcon, CheckIcon, ListIcon } from './ActionIcons';
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

// A word's letters as boxes: green where the letter is right, red where it is wrong
const LetterBoxes = ({ text, ok, label }) => (
  <div className="quiz-letters" role="img" aria-label={label}>
    {text.split('').map((c, i) => (
      <span key={i} className={`quiz-letter ${ok[i] ? 'quiz-letter-ok' : 'quiz-letter-bad'}`}>{c}</span>
    ))}
  </div>
);

// Quiz progress survives a refresh: saved per list (and learner) under `storageKey`
const loadSaved = (storageKey, words) => {
  if (!storageKey) return null;
  try {
    const v = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!v || !Array.isArray(v.order) || !Array.isArray(v.outcomes)) return null;
    const byWord = new Map(words.map(w => [w.word, w]));
    const order = v.order.map(w => byWord.get(w));
    if (order.some(w => !w) || v.idx > order.length) return null;
    return { order, idx: v.idx | 0, text: typeof v.text === 'string' ? v.text : '', result: v.result || null, outcomes: v.outcomes };
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
  const tutorial = useTutorial();

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ order: order.map(w => w.word), idx, text, result, outcomes }));
    } catch { /* storage unavailable */ }
  }, [storageKey, order, idx, text, result, outcomes]);

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
    const avg = done ? Math.round(outcomes.reduce((a, o) => a + o.pct, 0) / outcomes.length) : 0;
    const letter = letterFor(avg);
    // Hardest = lowest average over each word's last five attempts (this quiz's included)
    const form = outcomes.map(o => ({ word: o.word, pct: recentPct(historyFor(o.word), o.pct) }))
      .sort((a, b) => a.pct - b.pct).slice(0, 3);
    const hardSet = new Set(form.map(f => f.word));
    const choices = [
      { key: 'missed', label: 'Missed words', list: words.filter(w => missedSet.has(w.word)) },
      { key: 'hardest', label: 'Test the 3 hardest words', list: outcomes.length > 3 ? words.filter(w => hardSet.has(w.word)) : [] },
      { key: 'open', label: 'Not yet learned', list: words.filter(w => !isMastered(w.word)) },
      { key: 'all', label: 'All words, including learned', list: words }
    ].filter(c => c.list.length > 0);
    // Missed words get the main button; with none missed, the main button finishes
    const allClear = done && missed.length === 0;
    const primaryKey = missed.length > 0 ? 'missed' : null;
    const ICONS = { missed: <RefreshIcon />, hardest: <FlagIcon />, open: <ListIcon />, all: <RefreshIcon /> };
    return (
      <div className="quiz-immersive quiz-summary">
        <div className="quiz-top">
          <span />
          <button type="button" className="btn-secondary-sm" onClick={exit} aria-label="Exit quiz"><CloseIcon /> Exit</button>
        </div>
        <div className="quiz-stage">
          {done ? (
            <>
              <div className="session-grade" role="status" aria-label={`Quiz grade ${letter}, ${avg}%`}>
                <div className="deck-section-label">Quiz grade</div>
                <div className="session-grade-letter">{letter}</div>
                <div className="deck-score">{avg}%</div>
              </div>
              <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
                Tested out of {out} of {outcomes.length} {outcomes.length === 1 ? 'word' : 'words'}
              </p>
              <ul className="quiz-review" aria-label="Every word, with your spelling">
                {outcomes.map((o, n) => (
                  <li key={n} className="quiz-review-item">
                    <span className={`quiz-status ${o.testedOut ? 'quiz-status-ok' : 'quiz-status-miss'}`} role="img" aria-label={o.testedOut ? 'Tested out' : 'Not tested out'}>
                      {o.testedOut ? '✓' : '✕'}
                    </span>
                    <div className="quiz-review-label">Correct spelling</div>
                    <div className="quiz-wordbox" aria-label={`The word is ${o.word}`}>{o.word}</div>
                    <div className="quiz-review-label">Your spelling</div>
                    {o.typed
                      ? <LetterBoxes text={o.typed} ok={o.typedMatched} label={`You spelled ${o.typed}`} />
                      : <div className="quiz-review-empty">(nothing typed)</div>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ fontWeight: 700, margin: 0 }}>Every word is already learned. 🎉</p>
          )}
          <p className="quiz-label" style={{ margin: 0 }}>{done ? 'Quiz again' : 'Quiz anyway'}: what to focus on?</p>
          {allClear && (
            <button type="button" className="btn-verify" onClick={exit}><CheckIcon /> Finish</button>
          )}
          {choices.map(c => (
            <button key={c.key} type="button" className={c.key === primaryKey ? 'btn-verify' : 'btn-verify btn-verify-alt'} onClick={() => start(c.list)}>
              {ICONS[c.key]}
              {c.key === 'missed' ? `Retake missed ${c.list.length === 1 ? 'word' : 'words'} (${c.list.length})`
                : c.key === 'hardest' ? c.label
                : c.key === 'all' && missed.length === 0 && done ? `Retake all words (${c.list.length})`
                : `${c.label} (${c.list.length})`}
            </button>
          ))}
          {form.length > 0 && choices.some(c => c.key === 'hardest') && (
            <p className="deck-message" style={{ margin: 0 }}>
              Hardest (last 5 attempts): {form.map(f => `${f.word} ${f.pct}%`).join(', ')}
            </p>
          )}
          {!allClear && <button type="button" className="btn-secondary-sm" onClick={exit}><ChevronLeftIcon /> Back to practice</button>}
        </div>
      </div>
    );
  }

  const submit = () => {
    if (!text.trim() || result) return;
    const { matched, typedMatched, pct } = alignSpelling(text, word.word);
    const typed = text.trim().toLowerCase();
    onAttempts?.(word.word, matched.map((ok, i) => ({
      letter: word.word[i], position: i, correct: ok ? 1 : 0, typed: ok ? word.word[i] : (typed[i] || '')
    })));
    const r = commitQuiz(word.word, pct);
    setResult({ pct, testedOut: r.testedOut, unlearned: !!r.unlearned, matched, typedMatched, typed: text.trim() });
    setOutcomes(o => [...o, { word: word.word, testedOut: r.testedOut, pct, matched, typedMatched, typed: text.trim() }]);
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
          <div className="quiz-result" aria-live="polite">
            <fieldset className={`quiz-box ${result.pct === 100 ? 'quiz-box-right' : 'quiz-box-wrong'}`}>
              <legend>
                <span className={`quiz-icon ${result.pct === 100 ? 'quiz-icon-right' : 'quiz-icon-wrong'}`} aria-hidden="true">{result.pct === 100 ? '✓' : '✕'}</span>
                Your spelling
              </legend>
              {typedWord
                ? <LetterBoxes text={typedWord} ok={result.typedMatched} label={`You spelled ${typedWord}`} />
                : <div className="quiz-review-empty">(nothing typed)</div>}
            </fieldset>
            <fieldset className="quiz-box quiz-box-right">
              <legend><span className="quiz-icon quiz-icon-right" aria-hidden="true">✓</span>Correct spelling</legend>
              <div className="quiz-answer quiz-right" aria-label={`The word is ${word.word}`}>{word.word}</div>
            </fieldset>
          </div>
        )}
      </div>
      {mobile && keyboardHidden ? null : mobile ? (
        <KeyboardFrame>
        <VirtualKeyboard
          onChar={(c) => { if (!result) setText(t => t + c); }}
          onBackspace={() => { if (!result) setText(t => t.slice(0, -1)); }}
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
            <button type="button" className="btn-verify" onClick={next} autoFocus>
              {idx + 1 < order.length ? 'Next word' : 'See results'} <ChevronRightIcon />
            </button>
          ) : (
            <button type="button" className="btn-verify" onClick={submit} disabled={!text.trim()}><TaskAltIcon /> Check</button>
          )}
        </div>
      )}
    </div>
  );
}
