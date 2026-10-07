import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';

/** True on touch-first devices (phones, tablets) — not on narrow desktop windows. */
export default function useCoarsePointer() {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches;
  const [coarse, setCoarse] = useState(get);

  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return undefined;
    const onChange = () => setCoarse(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return coarse;
}
