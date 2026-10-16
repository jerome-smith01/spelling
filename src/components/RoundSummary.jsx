import React, { useState } from 'react';
import { recentPct } from '../utils/schedule';
import { LetterBoxes, cellsOf } from './SpellingResult';
import { ChevronLeftIcon, RefreshIcon, FlagIcon, CheckIcon, ListIcon } from './ActionIcons';

const GROUPED = ['open', 'hardest', 'nextHardest']; // shown together, set apart from the other choices
const ICONS = { missed: <RefreshIcon />, hardest: <FlagIcon />, nextHardest: <FlagIcon />, remaining: <RefreshIcon />, open: <ListIcon />, all: <RefreshIcon /> };

/**
 * The end-of-round screen, the same for the quiz and for a practice session so the two stay
 * consistent: the grade, every word with "Your spelling" and "Correct spelling" and a green check
 * or gray x, then what to focus on next (missed words, the hardest words and the not-yet-learned
 * words each with a slider, or everything).
 *
 *   outcomes  [{ word, ok, pct, typed?, cells? }]  this round's results (ok = 100% first try)
 *   words     every word of the list, [{ word }]
 *   base, drilled   the drill state (hooks/useDrill.js)
 *   onStart(list, mode)   begin a round on `list` (word objects); mode is 'drill' | 'keep' | 'reset'
 *   onFinish / onBack     optional Finish (when nothing was missed) and Back buttons
 *   extra     more buttons shown at the bottom (practice: Keep practicing, Take a quiz)
 */
export default function RoundSummary({
  gradeTitle, grade, headline, outcomes, words, isMastered = () => false, historyFor = () => [],
  base, drilled, onStart, onFinish, onBack, backLabel = 'Back to practice', extra = null, subject = 'Quiz'
}) {
  const [openN, setOpenN] = useState(null); // how many not-yet-learned words (null = all of them)
  const [hardN, setHardN] = useState(3);   // how many of the hardest words

  const done = outcomes.length > 0;
  const missed = outcomes.filter(o => !o.ok);
  const missedSet = new Set(missed.map(o => o.word));

  // Hardest = lowest average over each word's last five attempts (this round's included); a word at 100% is never hard
  const formOf = (o) => ({ word: o.word, pct: recentPct(historyFor(o.word), o.pct) });
  const form = outcomes.map(formOf).filter(f => f.pct < 100).sort((a, b) => a.pct - b.pct);
  // After a drill: what is left of the original round, minus the words already drilled
  const drilledSet = new Set(drilled);
  const left = (base || []).filter(o => !drilledSet.has(o.word));
  const leftForm = left.map(formOf).filter(f => f.pct < 100).sort((a, b) => a.pct - b.pct);
  const leftMissedSet = new Set(left.filter(o => !o.ok).map(o => o.word));
  const rank = base ? leftForm : form;
  const n = Math.max(1, Math.min(hardN, rank.length || 1));
  const hardList = rank.slice(0, n);
  const hardSet = new Set(hardList.map(f => f.word));
  const hardLabel = `${base ? 'Next' : 'Test the'} ${n} hardest ${n === 1 ? 'word' : 'words'}`;

  // Not-yet-learned words, weakest first
  const openAll = words.filter(w => !isMastered(w.word))
    .map(w => ({ word: w.word, pct: recentPct(historyFor(w.word), outcomes.find(o => o.word === w.word)?.pct) }))
    .sort((a, b) => a.pct - b.pct);
  const openCount = Math.max(1, Math.min(openN ?? openAll.length, openAll.length));
  const openList = openAll.slice(0, openCount);
  const openSet = new Set(openList.map(f => f.word));

  const choices = [
    { key: 'missed', label: 'Missed words', list: words.filter(w => missedSet.has(w.word)) },
    { key: 'remaining', label: 'Practice remaining missed words', list: base ? words.filter(w => leftMissedSet.has(w.word)) : [] },
    { key: 'all', label: 'All words, including learned', list: words },
    { key: 'open', label: 'Not yet learned', list: words.filter(w => openSet.has(w.word)) },
    { key: 'hardest', label: hardLabel, list: !base && rank.length > 0 ? words.filter(w => hardSet.has(w.word)) : [] },
    { key: 'nextHardest', label: hardLabel, list: base && rank.length > 0 ? words.filter(w => hardSet.has(w.word)) : [] }
  ].filter(c => c.list.length > 0);

  // Missed words get the main button; with none missed, the main button finishes
  const allClear = done && missed.length === 0;
  const primaryKey = missed.length > 0 ? 'missed' : null;

  const renderChoice = (c) => {
    const Wrap = GROUPED.includes(c.key) ? 'div' : React.Fragment; // grouped choices each sit in a tinted box
    const mode = c.key === 'hardest' || c.key === 'nextHardest' || c.key === 'remaining' ? 'drill' : c.key === 'missed' ? 'keep' : 'reset';
    return (
      <Wrap key={c.key} {...(GROUPED.includes(c.key) ? { className: 'quiz-block' } : {})}>
        <button type="button" className={`quiz-choice ${c.key === primaryKey ? 'btn-verify' : 'btn-verify btn-verify-alt'}`} onClick={() => onStart(c.list, mode)}>
          {ICONS[c.key]}
          {c.key === 'missed' ? `Retake missed ${c.list.length === 1 ? 'word' : 'words'} (${c.list.length})`
            : c.key === 'hardest' || c.key === 'nextHardest' ? c.label
            : c.key === 'remaining' ? `${c.label} (${c.list.length})`
            : c.key === 'all' && allClear ? `Retake all words (${c.list.length})`
            : `${c.label} (${c.list.length})`}
        </button>
        {c.key === 'open' && (
          <div className="quiz-hard">
            {openAll.length > 1 && (
              <input type="range" className="quiz-slider" min="1" max={openAll.length} value={openCount}
                onChange={(e) => setOpenN(Number(e.target.value))}
                aria-label="How many not yet learned words" aria-valuetext={`${openCount} ${openCount === 1 ? 'word' : 'words'}`} />
            )}
            <p className="quiz-note">Words you haven't tested out of yet</p>
            <ul className="quiz-chips" aria-label="Not yet learned words">
              {openList.map(f => <li key={f.word} className="quiz-chip">{f.word}</li>)}
            </ul>
          </div>
        )}
        {(c.key === 'hardest' || c.key === 'nextHardest') && (
          <div className="quiz-hard">
            {rank.length > 1 && (
              <input type="range" className="quiz-slider" min="1" max={rank.length} value={n}
                onChange={(e) => setHardN(Number(e.target.value))}
                aria-label="How many of the hardest words" aria-valuetext={`${n} ${n === 1 ? 'word' : 'words'}`} />
            )}
            <p className="quiz-note">Hardest (last 5 attempts)</p>
            <ul className="quiz-chips" aria-label="Hardest words">
              {hardList.map(f => <li key={f.word} className="quiz-chip">{f.word} {f.pct}%</li>)}
            </ul>
          </div>
        )}
      </Wrap>
    );
  };

  return (
    <div className="round-summary">
      {done ? (
        <>
          <div className="session-grade" role="status" aria-label={`${gradeTitle} ${grade.letter}, ${grade.pct}%`}>
            <div className="deck-section-label">{gradeTitle}</div>
            <div className="session-grade-letter">{grade.letter}</div>
            <div className="deck-score">{grade.pct}%</div>
          </div>
          <p style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>{headline}</p>
          <ul className="quiz-review" aria-label="Every word, with your spelling">
            {outcomes.map((o, i) => (
              <li key={`${o.word}-${i}`} className="quiz-review-item">
                <span className={`quiz-status ${o.ok ? 'quiz-status-ok' : 'quiz-status-miss'}`} role="img" aria-label={o.ok ? 'Tested out' : 'Not tested out'}>
                  {o.ok ? '✓' : '✕'}
                </span>
                <div className="quiz-review-label">Your spelling</div>
                {o.typed || o.cells
                  ? <LetterBoxes cells={cellsOf(o.cells, o.typed, o.word)} label={`You spelled ${o.typed ?? o.cells.map(c => c.ch).join('')}`} />
                  : <div className="quiz-review-empty">(nothing typed)</div>}
                <div className="quiz-review-label">Correct spelling</div>
                <div className="quiz-wordbox" aria-label={`The word is ${o.word}`}>{o.word}</div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p style={{ fontWeight: 700, margin: 0 }}>Every word is already learned. 🎉</p>
      )}
      <p className="quiz-label" style={{ margin: 0 }}>{done ? `${subject} again` : `${subject} anyway`}: what to focus on?</p>
      {allClear && onFinish && (
        <button type="button" className="btn-verify quiz-choice" onClick={onFinish}><CheckIcon /> Finish</button>
      )}
      {choices.filter(c => !GROUPED.includes(c.key)).map(renderChoice)}
      <div className="quiz-group">
        {choices.filter(c => GROUPED.includes(c.key)).map(renderChoice)}
      </div>
      {!(allClear && onFinish) && onBack && (
        <button type="button" className="btn-secondary-sm quiz-choice" onClick={onBack}><ChevronLeftIcon /> {backLabel}</button>
      )}
      {extra}
    </div>
  );
}
