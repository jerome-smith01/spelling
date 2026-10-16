import React, { useCallback, useEffect, useRef, useState } from 'react';
import useCoarsePointer from '../hooks/useCoarsePointer';
import { SearchCheckIcon, CheckIcon } from './ActionIcons';

const MESSAGE = 'Take time to review your work.';
const WRONG_TRIES_BEFORE_REVEAL = 2;

/**
 * "Take time to review your work": shown when a child rushes past a mistake (useReviewGate).
 * Sits at the top of the screen, below the on-screen keyboard's layer, so the keyboard is never covered.
 *   level 1  informational, one OK button
 *   level 2  tap each wrong letter in their spelling
 *   level 3  type the right letter into each wrong spot
 * `hasKeyboard` says whether the app's own keyboard is on screen to type with.
 */
export default function ReviewModal({ gate, hasKeyboard = false }) {
  const { modal } = gate;
  if (!modal) return null;
  return <ReviewDialog key={`${modal.word}-${modal.level}-${modal.dwellMs}`} modal={modal} gate={gate} hasKeyboard={hasKeyboard} />;
}

function ReviewDialog({ modal, gate, hasKeyboard }) {
  const { level, cells } = modal;
  const coarse = useCoarsePointer();
  const dialogRef = useRef(null);
  const [done, setDone] = useState(() => new Set()); // indices tapped (level 2) or filled (level 3)
  const [shake, setShake] = useState(-1);
  const [wrongTries, setWrongTries] = useState(0);
  const wrongOnSlot = useRef(0);

  const todo = cells.map((c, i) => (!c.ok && (level === 2 || c.fix) ? i : -1)).filter(i => i >= 0);
  const complete = level !== 1 && todo.every(i => done.has(i));
  const finishRef = useRef(gate.finish);
  finishRef.current = gate.finish;
  const triesRef = useRef(0);
  triesRef.current = wrongTries;

  // Show the finished row for a moment, then close
  useEffect(() => {
    if (!complete) return undefined;
    const t = setTimeout(() => finishRef.current({ tries: triesRef.current }), 900);
    return () => clearTimeout(t);
  }, [complete]);

  useEffect(() => { dialogRef.current?.focus(); }, []);

  const flash = (i) => { setShake(i); setTimeout(() => setShake(-1), 400); };

  const tap = (i) => {
    if (level !== 2) return;
    if (cells[i].ok) { setWrongTries(n => n + 1); flash(i); return; }
    setDone(d => new Set(d).add(i));
  };

  const press = useCallback((raw) => {
    if (level !== 3) return;
    const c = String(raw || '').toLowerCase();
    if (!/^[a-z]$/.test(c)) return;
    const slot = todo.find(i => !done.has(i));
    if (slot === undefined) return;
    if (cells[slot].fix.toLowerCase() === c) {
      wrongOnSlot.current = 0;
      setDone(d => new Set(d).add(slot));
      return;
    }
    setWrongTries(n => n + 1);
    flash(slot);
    wrongOnSlot.current += 1;
    // Never stuck: after two wrong tries the answer fills in
    if (wrongOnSlot.current >= WRONG_TRIES_BEFORE_REVEAL) {
      wrongOnSlot.current = 0;
      setDone(d => new Set(d).add(slot));
    }
  }, [level, todo, done, cells]);

  // The app's on-screen keyboard and a physical keyboard both type into the slots
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    if (level !== 3) return undefined;
    gate.keyRef.current = { press: (c) => pressRef.current(c) };
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      e.preventDefault();
      pressRef.current(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); gate.keyRef.current = null; };
  }, [level, gate.keyRef]);

  // Level 1 closes with Enter, Space or Escape
  useEffect(() => {
    if (level !== 1) return undefined;
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finishRef.current({}); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level]);

  const nextSlot = todo.find(i => !done.has(i));
  // No app keyboard on a touch screen (e.g. choice cards): a hidden field brings up the device keyboard
  const needsNativeInput = level === 3 && coarse && !hasKeyboard;

  return (
    <div className="review-backdrop">
      <div ref={dialogRef} className="review-dialog" role="alertdialog" aria-modal="true" aria-labelledby="review-msg" tabIndex={-1}>
        <div className="review-head">
          <SearchCheckIcon size="2.4rem" />
          <h2 id="review-msg" className="review-msg">{MESSAGE}</h2>
        </div>
        {level === 2 && <p className="review-step">Tap the wrong letter.</p>}
        {level === 3 && <p className="review-step">Fix it: type the right letter.</p>}

        {level > 1 && (
          <div className="quiz-letters review-row" role="group" aria-label="Your spelling">
            {cells.map((c, i) => {
              const fixed = done.has(i);
              const cls = ['quiz-letter'];
              if (c.ok || (fixed && c.fix)) cls.push('quiz-letter-ok');
              else cls.push('quiz-letter-bad');
              if (!c.ok && !fixed && !c.ch) cls.push('quiz-letter-missing');
              if (shake === i) cls.push('review-shake');
              if (level === 3 && i === nextSlot) cls.push('review-active');
              if (!c.ok && fixed && !c.fix) cls.push('review-removed');
              const text = c.ok ? c.ch : fixed ? (c.fix || c.ch) : (level === 3 && c.fix ? '' : c.ch);
              if (level === 2) {
                return (
                  <button key={i} type="button" className={`${cls.join(' ')} review-tap`} onClick={() => tap(i)}
                    aria-label={c.ok ? `${c.ch}: right` : fixed ? `${text || 'extra letter'}: fixed` : c.ch ? `${c.ch}: tap if wrong` : 'Empty spot: tap if letters are missing'}>
                    {text}
                  </button>
                );
              }
              return <span key={i} className={cls.join(' ')}>{text}</span>;
            })}
          </div>
        )}

        {needsNativeInput && (
          <input
            className="sr-only"
            autoFocus
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            aria-label="Type the right letter"
            onInput={(e) => { press(e.target.value.slice(-1)); e.target.value = ''; }}
          />
        )}

        {level === 1 && (
          <button type="button" className="btn-verify review-ok" onClick={() => gate.finish({})} autoFocus>
            <CheckIcon /> OK
          </button>
        )}
      </div>
    </div>
  );
}
