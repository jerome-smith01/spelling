import { useState } from 'react';

/**
 * Drilling a round: after the original round (quiz or practice session), the child can drill its
 * hardest words, then the next hardest, then what is left. `base` is the original round's results
 * ({ word, ok, pct }) and `drilled` the words already drilled from it.
 *
 *   apply(list, mode, outcomes)
 *     'drill'  pick from the original round (kept; set from `outcomes` the first time)
 *     'keep'   a retake within a drill (the original round stays)
 *     'reset'  a fresh round: forget the original
 */
export default function useDrill(initial = {}) {
  const norm = (b) => (Array.isArray(b) ? b.map(o => ({ word: o.word, ok: o.ok ?? !!o.testedOut, pct: o.pct })) : null);
  const [base, setBase] = useState(() => norm(initial.base));
  const [drilled, setDrilled] = useState(initial.drilled ?? []);

  const apply = (list, mode, outcomes) => {
    if (mode === 'drill') {
      setBase(b => b ?? outcomes.map(o => ({ word: o.word, ok: o.ok, pct: o.pct })));
      setDrilled(d => [...new Set([...d, ...list.map(w => w.word)])]);
    } else if (mode === 'reset' || !base) {
      setBase(null);
      setDrilled([]);
    }
  };
  return { base, drilled, apply };
}
