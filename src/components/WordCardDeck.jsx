import React, { useEffect, useMemo, useRef, useState } from 'react';
import WordCard from './WordCard';
import QuizView from './QuizView';
import VirtualKeyboard from './VirtualKeyboard';
import useCoarsePointer from '../hooks/useCoarsePointer';
import TutorialPrompt from './TutorialPrompt';
import ChoicePicker from './ChoicePicker';
import StageBall from './StageBall';
import AutoplayToggle from './AutoplayToggle';
import ProgressBars from './ProgressBars';
import DeckLegend from './DeckLegend';
import { CheckIcon, CloseIcon, QuestionIcon } from './SessionIcons';
import { PlayIcon, SlowPlayIcon } from './AudioIcons';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import { useTutorial } from '../hooks/useTutorial';
import { PRACTICE_STEPS, QUIZ_STEPS, TUTORIAL_KEYS } from '../utils/tutorialSteps';
import { hiddenIndicesForLevel, addDays, daysLeft } from '../utils/schedule';
import { findTargets, hintsForWord } from '../utils/smartHide';
import {
  makeSession, currentWord, recordResult, recordSkip, advance as advanceSession, goTo, endEarly, sessionGrade
} from '../utils/session';

// Auto-play repeats whichever speed button the student used last (kept across visits)
const SPEED_KEY = 'spelling_tutor_last_audio_v1';
const lastSpeed = () => { try { return localStorage.getItem(SPEED_KEY) === 'slow' ? 'slow' : 'normal'; } catch { return 'normal'; } };
const setLastSpeed = (v) => { try { localStorage.setItem(SPEED_KEY, v); } catch { /* storage unavailable */ } };

const targetExists = (st) => !st.target || !!document.querySelector(`[data-tutorial="${st.target}"]`);

const fmtDay = (iso, today) => {
  if (!iso) return '';
  if (iso === today) return 'later today';
  if (iso === addDays(today, 1)) return 'tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

/** One-card-at-a-time flip deck with progressive hiding and a quiz mode. */
export default function WordCardDeck({
  words, schedule, onSpeak, onSpeakSyllables, activePlayback, onAttempts, frictionByWord = {},
  focusGroups = [], struggleByWord = {}, hints = [], initialMode = 'practice', keyboardHidden = false, dueDate = null
}) {
  const { queue, today, testDate, progress, stateFor, commit, practiceAnyway, commitQuiz, refreshQueue } = schedule;
  const [mode, setMode] = useState(initialMode);
  const [result, setResult] = useState(null); // set once Check flips the card
  const [cardKey, setCardKey] = useState(0);
  // The session's cards, in a fixed order: dot N is the Nth card (see utils/session.js)
  const [session, setSession] = useState(() => makeSession(queue));
  const queueKey = queue.join('|');
  const sessionKeyRef = useRef(queueKey);
  const [restartTick, setRestartTick] = useState(0);
  const restartRef = useRef(false);
  const restartSession = () => { restartRef.current = true; setRestartTick(t => t + 1); };
  const [legendOpen, setLegendOpen] = useState(false);
  const backRef = useRef(null);
  const kbRef = useRef(null);
  const coarse = useCoarsePointer();
  const [canCheck, setCanCheck] = useState(false);
  const tutorial = useTutorial();
  const hasCard = words.length > 0;

  // First visit to the practice screen: run the next unseen batch (max 3 steps) once the layout settles.
  // Leaving the screen or switching modes cancels without marking anything seen.
  useEffect(() => {
    if (mode !== 'practice' || !hasCard) return undefined;
    const t = setTimeout(() => {
      tutorial.checkAndStart(TUTORIAL_KEYS.practice, PRACTICE_STEPS, {
        isAvailable: targetExists,
        onBeforeStart: () => window.scrollTo?.({ top: 0 })
      });
    }, 700);
    return () => { clearTimeout(t); tutorial.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasCard, tutorial.decided, tutorial.enabled]);

  const startTour = () => {
    const quiz = mode === 'quiz';
    tutorial.restart(quiz ? TUTORIAL_KEYS.quiz : TUTORIAL_KEYS.practice, quiz ? QUIZ_STEPS : PRACTICE_STEPS, { isAvailable: targetExists });
  };

  // The speed the student tapped last: auto-play repeats it on the next word and its button is outlined
  const [speed, setSpeed] = useState(lastSpeed);
  const userSpeak = (id, text) => { setLastSpeed('normal'); setSpeed('normal'); onSpeak(id, text); };
  const userSpeakSyllables = (id, syl) => { setLastSpeed('slow'); setSpeed('slow'); onSpeakSyllables?.(id, syl); };

  const byText = useMemo(() => Object.fromEntries(words.map(w => [w.word, w])), [words]);
  const curWord = currentWord(session);
  const current = (curWord && byText[curWord]) || null;

  // Start a fresh session when the queue's words change (new list) or a restart is asked for
  // ("Keep practicing", leaving a quiz). A rebuild with the same words keeps the session.
  useEffect(() => {
    if (!restartRef.current && sessionKeyRef.current === queueKey) return;
    restartRef.current = false;
    sessionKeyRef.current = queueKey;
    setSession(makeSession(queue));
    setResult(null);
    setCardKey(k => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKey, restartTick]);

  // Freeze the level while a card is on screen (grading changes stored level immediately)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const level = useMemo(() => (current ? stateFor(current.word).level : 1), [current?.word, cardKey]);
  // Smart hiding: a list with focus letters hides the lesson's letters (see smartHide.js)
  const struggle = current ? struggleByWord[current.word] : undefined;
  const hiddenIndices = useMemo(
    () => (current
      ? hiddenIndicesForLevel(current.letterCount, level,
        focusGroups.length ? { word: current.word, groups: focusGroups, struggle } : null)
      : new Set()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, level, focusGroups.join(','), (struggle || []).join(',')]
  );
  const targets = useMemo(
    () => (current && focusGroups.length ? findTargets(current.word, focusGroups) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.word, focusGroups.join(',')]
  );
  const smartWord = targets.length > 0;
  // Level 1 is multiple choice when the lesson offers at least two groups to choose from
  const useChoice = smartWord && level === 1 && focusGroups.length >= 2;

  useEffect(() => { if (result) backRef.current?.focus(); }, [result]);

  // Optional: say each word as its card appears (also on first load). Browsers may hold the
  // first utterance until the page has had a tap or key press.
  useEffect(() => {
    if (schedule.prefs.autoSpeak === false || mode !== 'practice' || !current) return undefined;
    const t = setTimeout(() => {
      if (lastSpeed() === 'slow' && onSpeakSyllables) onSpeakSyllables(current.id, buildPronunciationSyllables(current));
      else onSpeak(current.id, current.word);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.prefs.autoSpeak, mode, current?.word, cardKey]);

  if (!words.length) return null;

  const handleResult = ({ pct, results, typed }) => {
    const res = commit(current.word, pct);
    setSession(sess => recordResult(sess, pct));
    setResult({ pct, results, typed, res });
  };

  const move = (fn) => {
    setSession(fn);
    setResult(null);
    setCardKey(k => k + 1);
  };
  const goNext = () => move(advanceSession);
  const skipCard = () => move(sess => advanceSession(recordSkip(sess)));
  const goBack = () => move(sess => goTo(sess, sess.idx - 1));
  const goToCard = (i) => move(sess => goTo(sess, i));
  const endSession = () => move(endEarly);

  // An assigned list's due date stands in for the deck's own test date
  const dayShown = dueDate || testDate;
  const left = daysLeft(today, dayShown);
  const word = dueDate ? 'Due' : 'Test';
  const testLine = dayShown
    ? (left > 0 ? `${word} in ${left} ${left === 1 ? 'day' : 'days'} (${fmtDay(dayShown, today)})`
      : dayShown < today ? (dueDate ? 'Overdue' : 'Test day!') : `${word} day!`)
    : 'No test date set (see Settings)';

  const tabs = (
    <>
    <div className="deck-bar">
      <div className="deck-tabs" role="group" aria-label="Mode" data-tutorial="modes">
        <button type="button" className="deck-tab" aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Practice</button>
        <button type="button" className="deck-tab" aria-pressed={mode === 'quiz'} onClick={() => setMode('quiz')}>Quiz</button>
      </div>
      <button type="button" className="btn-secondary-sm" style={{ marginLeft: 'auto' }} onClick={startTour} aria-label="Restart the guided tour">❓ Tour</button>
    </div>
    <div className="deck-test-line">{testLine}</div>
    </>
  );

  if (mode === 'quiz') {
    return (
      <div className="deck">
        {tabs}
        <QuizView
          words={words}
          isMastered={(w) => !!progress.words[w]?.mastered}
          onSpeak={onSpeak}
          onAttempts={onAttempts}
          commitQuiz={commitQuiz}
          onExit={() => { refreshQueue(); restartSession(); setMode('practice'); }}
          keyboardHidden={keyboardHidden}
        />
      </div>
    );
  }

  const statusLabel = { ok: 'scored 100%', miss: 'missed', skip: 'skipped' };
  const dotIcon = { ok: <CheckIcon />, miss: <CloseIcon />, skip: <QuestionIcon /> };
  const strip = (
    <div data-tutorial="strip">
      <div className="deck-strip session" role="list" aria-label="Session cards">
        {session.order.map((word, i) => {
          const st = session.status[word];
          const isCurrent = !session.ended && i === session.idx;
          return (
            <button
              key={word}
              type="button"
              role="listitem"
              className={`sess-dot ${st || ''} ${isCurrent ? 'current' : ''}`}
              aria-label={`Card ${i + 1} of ${session.order.length}: ${statusLabel[st] || (isCurrent ? 'current' : 'not reached yet')}${isCurrent ? '' : '. Go to this card'}`}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => goToCard(i)}
            >
              {dotIcon[st]}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!current) {
    const grade = sessionGrade(session);
    const upcoming = Object.values(progress.words).filter(s => !s.mastered && s.due).map(s => s.due).sort()[0];
    return (
      <div className="deck">
        {tabs}
        {strip}
        <div className="deck-card-center">
          <div style={{ fontSize: '2.5rem' }}>🎉</div>
          <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>All done for today!</p>
          {grade && (
            <div className="session-grade" role="status" aria-label={`Session grade ${grade.letter}, ${grade.pct}%`}>
              <div className="deck-section-label">Session grade</div>
              <div className="session-grade-letter">{grade.letter}</div>
              <div className="deck-score">{grade.pct}%</div>
              <p className="deck-message" style={{ margin: 0 }}>
                {grade.perfect} of {grade.cards} {grade.cards === 1 ? 'card' : 'cards'} right on the first try
              </p>
            </div>
          )}
          {upcoming && <p className="deck-message" style={{ margin: 0 }}>Next words come back {fmtDay(upcoming, today)}.</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn-verify" onClick={() => { practiceAnyway(); restartSession(); }}>Keep practicing</button>
            <button type="button" className="btn-secondary-sm" onClick={() => setMode('quiz')}>Take a quiz</button>
          </div>
        </div>
      </div>
    );
  }

  const letters = current.syllables.flat();
  const dock = coarse && !useChoice && !keyboardHidden;
  return (
    <div className={`deck${dock ? ' deck-has-dock' : ''}`}>
      {tabs}
      <TutorialPrompt onAccept={() => tutorial.checkAndStart(TUTORIAL_KEYS.practice, PRACTICE_STEPS, { isAvailable: targetExists })} />
      {strip}
      <div className={`deck-flip ${result ? 'flipped' : ''}`}>
        <div className="deck-flip-inner">
          <div
            className="deck-face front"
            aria-hidden={!!result}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const check = e.currentTarget.querySelector('.btn-verify');
              if (check && !check.disabled) { e.preventDefault(); check.click(); }
            }}
          >
            {useChoice ? (
              <ChoicePicker
                key={`${current.id}-${cardKey}`}
                word={current}
                targets={targets}
                groups={focusGroups}
                onSpeak={userSpeak}
                onSpeakSyllables={userSpeakSyllables}
                activePlayback={activePlayback}
                onAttempts={onAttempts}
                defaultSpeed={speed}
                autoFocus
                onResult={handleResult}
              />
            ) : (
            <WordCard
              key={`${current.id}-${cardKey}`}
              word={current}
              hiddenIndices={hiddenIndices}
              onHide={() => {}}
              onShow={() => {}}
              onSpeak={userSpeak}
              onSpeakSyllables={userSpeakSyllables}
              activePlayback={activePlayback}
              onAttempts={onAttempts}
              friction={frictionByWord[current.word] || 0}
              deckMode
              autoPlay={schedule.prefs.autoSpeak !== false}
              defaultSpeed={speed}
              onAutoPlayChange={(v) => schedule.setPrefs({ autoSpeak: v })}
              autoFocus
              keyboardRef={kbRef}
              onCanCheck={setCanCheck}
              onResult={handleResult}
              onBack={goBack}
              onSkip={skipCard}
              canBack={session.idx > 0}
            />
            )}
          </div>
          <div className="deck-face back" aria-hidden={!result}>
            {result && (
              <div
                className="deck-back"
                ref={backRef}
                tabIndex={-1}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); goNext(); } }}
              >
                <div className="word-card-header" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button type="button" className={`speaker-btn${speed === 'slow' ? ' is-default' : ''}`}
                      onClick={() => userSpeakSyllables(current.id, buildPronunciationSyllables(current))}
                      aria-label={`Hear ${current.word} syllable by syllable`}><SlowPlayIcon /></button>
                    <button type="button" className={`speaker-btn${speed === 'normal' ? ' is-default' : ''}`} onClick={() => userSpeak(current.id, current.word)}
                      aria-label={`Hear ${current.word} at normal speed`}><PlayIcon /></button>
                  </div>
                  <AutoplayToggle checked={schedule.prefs.autoSpeak !== false}
                    onChange={(v) => schedule.setPrefs({ autoSpeak: v })} />
                </div>
                <div className="deck-back-word" aria-label={`The word is ${current.word}`} style={{ marginTop: '1rem' }}>
                  {letters.map(l => {
                    const hidden = hiddenIndices.has(l.index);
                    const ok = !hidden || result.results[l.index] === 'correct';
                    const typed = (result.typed[l.index] || '').toLowerCase();
                    return (
                      <div key={l.index} className="deck-back-letter">
                        {hidden && !ok && typed && <span className="deck-back-typed">{typed}</span>}
                        <div className={`letter-box ${hidden ? (ok ? 'correct' : 'incorrect') : ''}`}>{l.char}</div>
                      </div>
                    );
                  })}
                </div>
                {result.pct < 100 && hintsForWord(current.word, focusGroups, hints).slice(0, 1).map(h => (
                  <p key={h} className="deck-hint">💡 {h}</p>
                ))}
                <div className="deck-section-label">Progress History</div>
                <ProgressBars attempts={progress.words[current.word]?.history || []} />
                <button type="button" className="btn-verify" onClick={goNext}>Next card</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="deck-end">
        <button type="button" className="btn-secondary-sm" onClick={() => setLegendOpen(true)}>Legend</button>
        <button type="button" className="btn-secondary-sm" onClick={endSession}>End session</button>
      </div>
      {legendOpen && <DeckLegend onClose={() => setLegendOpen(false)} />}
      {dock && (
        <div className="vkb-dock">
          <VirtualKeyboard
            onChar={(c) => { if (!result) kbRef.current?.press(c); }}
            onBackspace={() => { if (!result) kbRef.current?.backspace(); }}
            onEnter={() => kbRef.current?.check()}
            enterDisabled={!!result || !canCheck}
            enterLabel="Check"
            onPrev={goBack}
            prevDisabled={session.idx === 0}
            onNext={result ? goNext : skipCard}
            nextLabel={result ? 'Next card' : 'Skip this card for now'}
            onPlaySlow={() => userSpeakSyllables(current.id, buildPronunciationSyllables(current))}
            onPlay={() => userSpeak(current.id, current.word)}
            defaultSpeed={speed}
          />
        </div>
      )}
    </div>
  );
}
