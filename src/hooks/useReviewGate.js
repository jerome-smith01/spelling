import { useCallback, useRef, useState } from 'react';
import { isRushed, levelFor } from '../utils/reviewPolicy';
import { recordReviewEvent } from '../services/reviewEvents';

/**
 * Asks a child to look at a mistake before moving on, but only if they are rushing.
 *
 *   gate.show({ word, correct, cells })  call when a word's result appears (also when one is restored)
 *   gate.guard(proceed)                  wrap every way of leaving the result; runs `proceed`, or opens the popup
 *   gate.finish({ tries })               the popup calls this when the child has done what it asked
 *   gate.reset()                         a new round or session starts clean
 *
 * Strikes count rushed misses across the whole round or session (not per word): the 1st gets the
 * level-1 popup, the 2nd level 2, the 3rd and later level 3. A new round or session starts at 0
 * (gate.reset). `modal` is { level, word, cells, dwellMs } while the popup is open. Kept in memory only.
 */
export default function useReviewGate({ context, listId }) {
  const [modal, setModal] = useState(null);
  const modalRef = useRef(null);
  const strikes = useRef(0);
  const shown = useRef(null);
  const finishedAt = useRef(0);
  const keyRef = useRef(null); // the level-3 popup registers { press } here for the on-screen keyboard

  const show = useCallback(({ word, correct, cells }) => {
    shown.current = { word, correct, cells, shownAt: Date.now(), reviewed: false };
  }, []);

  const guard = useCallback((proceed) => {
    // The same Enter that closes the popup must not also leave the result
    if (modalRef.current || Date.now() - finishedAt.current < 300) return;
    const r = shown.current;
    if (!r || r.correct || r.reviewed) { shown.current = null; proceed(); return; }
    const dwell = Date.now() - r.shownAt;
    if (!isRushed(dwell)) { shown.current = null; proceed(); return; }
    const next = ++strikes.current;
    const m = { level: levelFor(next), word: r.word, cells: r.cells, dwellMs: dwell };
    modalRef.current = m;
    setModal(m);
  }, []);

  const finish = useCallback(({ tries = 0 } = {}) => {
    const m = modalRef.current;
    if (!m) return;
    if (shown.current) shown.current.reviewed = true;
    recordReviewEvent({ context, list_id: listId, word: m.word, level: m.level, dwell_ms: m.dwellMs, tries });
    modalRef.current = null;
    finishedAt.current = Date.now();
    setModal(null);
  }, [context, listId]);

  const reset = useCallback(() => {
    strikes.current = 0;
    shown.current = null;
    modalRef.current = null;
    setModal(null);
  }, []);

  return { modal, show, guard, finish, reset, keyRef };
}
