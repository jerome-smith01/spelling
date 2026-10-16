import { useCallback, useEffect, useState } from 'react';
import { learnerKey } from '../services/activeLearner';
import { DEFAULT_LAYOUT, parseLayout } from '../utils/keyboardLayout';

const KEY = 'spelling_tutor_keyboard_layout_v1';

const load = () => {
  try {
    const raw = localStorage.getItem(learnerKey(KEY));
    return raw ? parseLayout(raw) : { ...DEFAULT_LAYOUT };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
};

/** Where the tablet keyboard sits and how big it is; remembered per device and learner. */
export default function useKeyboardLayout() {
  const [layout, setLayout] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(learnerKey(KEY), JSON.stringify(layout)); } catch { /* storage unavailable */ }
  }, [layout]);

  const update = useCallback((patch) => setLayout(l => ({ ...l, ...patch })), []);
  return [layout, update];
}
