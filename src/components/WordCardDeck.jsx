import React, { useEffect, useMemo, useRef, useState } from 'react';
import WordCard from './WordCard';
import QuizView from './QuizView';
import VirtualKeyboard from './VirtualKeyboard';
import useCoarsePointer from '../hooks/useCoarsePointer';
import TutorialPrompt from './TutorialPrompt';
import ChoicePicker from './ChoicePicker';
import HarveyBall from './HarveyBall';
import { useTutorial } from '../hooks/useTutorial';
import { PRACTICE_STEPS, QUIZ_STEPS, TUTORIAL_KEYS } from '../utils/tutorialSteps';
import { LEVELS, hiddenIndicesForLevel, addDays, daysLeft } from '../utils/schedule';
import { findTargets, hintsForWord, levelText, quartersFor, SMART_LEVEL_LABELS } from '../utils/smartHide';

const REGULAR_LABELS = LEVELS.map(l => l.label);

const targetExists = (st) => !st.target || !!document.querySelector(`[data-tutorial="${st.target}"]`);

const fmtDay = (iso, today) => {
  if (!iso) return '';
  if (iso === today) return 'later today';
  if (iso === addDays(today, 1)) return 'tomorrow';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

function nextMessage(next, today, labels = REGULAR_LABELS) {
  switch (next.kind) {
    case 'drop': return `Dropping back to ${labels[next.level - 1].toLowerCase()}. It will come back later this session.`;
    case 'stay': return 'So close! Same level. It will come back later this session.';
    case 'again-today': return `Great! The test is close, so it comes back later this session at ${labels[next.level - 1].toLowerCase()}.`;
    case 'advance': return `Great! Next time: ${labels[next.level - 1].toLowerCase()}, ${fmtDay(next.due, today)}.`;
    case 'mastered': return next.due ? `Learned! 🎉 One last check ${fmtDay(next.due, today)}.` : 'Learned! 🎉';
    default: return '';
  }
}

/** One-card-at-a-time flip deck with progressive hiding and a quiz mode. */
export default function WordCardDeck({
  words, schedule, onSpeak, onSpeakSyllables, activePlayback, onAttempts, frictionByWord = {},
  focusGroups = [], struggleByWord = {}, hints = [], initialMode = 'practice'
}) {
  const { queue, dueCount, today, testDate, progress, stateFor, jumpTo, commit, advance, practiceAnyway, commitQuiz, refreshQueue } = schedule;
  const [mode, setMode] = useState(initialMode);
  const [result, setResult] = useState(null); // set once Check flips the card
  const [cardKey, setCardKey] = useState(0);
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

  const byText = useMemo(() => Object.fromEntries(words.map(w => [w.word, w])), [words]);
  const current = queue.map(t => byText[t]).find(Boolean) || null;

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
  const labels = smartWord ? SMART_LEVEL_LABELS : REGULAR_LABELS;
  // Level 1 is multiple choice when the lesson offers at least two groups to choose from
  const useChoice = smartWord && level === 1 && focusGroups.length >= 2;

  useEffect(() => { if (result) backRef.current?.focus(); }, [result]);

  if (!words.length) return null;

  const handleResult = ({ pct, results, typed }) => {
    const res = commit(current.word, pct);
    setResult({ pct, results, typed, res });
  };

  const goNext = () => {
    advance(result.res.requeue);
    setResult(null);
    setCardKey(k => k + 1);
  };

  const left = daysLeft(today, testDate);
  const testLine = testDate
    ? (left > 0 ? `Test in ${left} ${left === 1 ? 'day' : 'days'} (${fmtDay(testDate, today)})` : 'Test day!')
    : 'No test date set (see Settings)';

  const tabs = (
    <div className="deck-bar">
      <div className="deck-tabs" role="group" aria-label="Mode" data-tutorial="modes">
        <button type="button" className="deck-tab" aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Practice</button>
        <button type="button" className="deck-tab" aria-pressed={mode === 'quiz'} onClick={() => setMode('quiz')}>Quiz</button>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {testLine}
        <button type="button" className="btn-secondary-sm" onClick={startTour} aria-label="Restart the guided tour">❓ Tour</button>
      </span>
    </div>
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
          onExit={() => { refreshQueue(); setMode('practice'); }}
        />
      </div>
    );
  }

  const strip = (
    <div data-tutorial="strip">
      <div className="deck-bar" style={{ marginBottom: '0.4rem' }}>
        <span>{dueCount} due today</span>
        <span>{words.filter(w => progress.words[w.word]?.mastered).length} of {words.length} learned</span>
      </div>
      <div className="deck-strip" role="list" aria-label="Words">
        {words.map(w => {
          const st = progress.words[w.word];
          const text = levelText(st, LEVELS.length);
          return (
            <button
              key={w.id}
              type="button"
              role="listitem"
              className={`deck-dot harvey ${current?.word === w.word ? 'current' : ''}`}
              title={`${w.word}: ${text}`}
              aria-label={`${w.word}: ${text}. Practice this word`}
              disabled={!!result}
              onClick={() => { jumpTo(w.word); setCardKey(k => k + 1); }}
            >
              <HarveyBall quarters={quartersFor(st)} size={20} />
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!current) {
    const upcoming = Object.values(progress.words).filter(s => !s.mastered && s.due).map(s => s.due).sort()[0];
    return (
      <div className="deck">
        {tabs}
        {strip}
        <div className="deck-card-center">
          <div style={{ fontSize: '2.5rem' }}>🎉</div>
          <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>All done for today!</p>
          {upcoming && <p className="deck-message" style={{ margin: 0 }}>Next words come back {fmtDay(upcoming, today)}.</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn-verify" onClick={() => { practiceAnyway(); setCardKey(k => k + 1); }}>Keep practicing</button>
            <button type="button" className="btn-secondary-sm" onClick={() => setMode('quiz')}>Take a quiz</button>
          </div>
        </div>
      </div>
    );
  }

  const letters = current.syllables.flat();
  const dock = coarse && !useChoice;
  return (
    <div className={`deck${dock ? ' deck-has-dock' : ''}`}>
      {tabs}
      <TutorialPrompt onAccept={() => tutorial.checkAndStart(TUTORIAL_KEYS.practice, PRACTICE_STEPS, { isAvailable: targetExists })} />
      {strip}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span className="deck-badge deck-level" data-tutorial="level">
          <HarveyBall quarters={quartersFor(progress.words[current.word])} size={16} />
          Level {level} of {LEVELS.length} · {labels[level - 1]}
        </span>
        <span className="deck-badge">{queue.length} in today's queue</span>
      </div>

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
                onSpeak={onSpeak}
                onSpeakSyllables={onSpeakSyllables}
                activePlayback={activePlayback}
                onAttempts={onAttempts}
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
              onSpeak={onSpeak}
              onSpeakSyllables={onSpeakSyllables}
              activePlayback={activePlayback}
              onAttempts={onAttempts}
              friction={frictionByWord[current.word] || 0}
              deckMode
              autoFocus
              keyboardRef={kbRef}
              onCanCheck={setCanCheck}
              onResult={handleResult}
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
                <div className="deck-score">{result.pct}%</div>
                {result.pct < 100 && hintsForWord(current.word, focusGroups, hints).slice(0, 1).map(h => (
                  <p key={h} className="deck-hint">💡 {h}</p>
                ))}
                <p className="deck-message" style={{ margin: 0 }}>{nextMessage(result.res.next, today, labels)}</p>
                <button type="button" className="btn-verify" onClick={goNext}>Next card</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {dock && (
        <div className="vkb-dock">
          <VirtualKeyboard
            onChar={(c) => { if (!result) kbRef.current?.press(c); }}
            onBackspace={() => { if (!result) kbRef.current?.backspace(); }}
            onEnter={() => (result ? goNext() : kbRef.current?.check())}
            enterDisabled={!result && !canCheck}
            enterLabel={result ? 'Next card' : 'Check'}
          />
        </div>
      )}
    </div>
  );
}
