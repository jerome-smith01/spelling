import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getStrugglePositions } from '../services/coachingApi';

/**
 * { word: [letter indices] } covered by the learner's ACTIVE spelling patterns, used
 * by smart hiding's level-3 struggle override. Logged in only; logged out (or offline)
 * returns {} and level 3 uses the alternating letters instead.
 */
export function useStrugglePositions(wordTexts) {
  const { isLoggedIn } = useAuth();
  const [positions, setPositions] = useState({});
  const key = wordTexts.join('|');

  useEffect(() => {
    if (!isLoggedIn || !key) {
      setPositions({});
      return undefined;
    }
    let cancelled = false;
    getStrugglePositions(key.split('|'))
      .then(res => { if (!cancelled && res?.positions) setPositions(res.positions); })
      .catch(() => { /* no override without the server */ });
    return () => { cancelled = true; };
  }, [isLoggedIn, key]);

  return positions;
}
