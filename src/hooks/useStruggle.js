import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getScores } from '../services/coachingApi';
import { readQueue, subscribe } from '../services/attemptQueue';
import { frictionByWord } from '../utils/friction';

/**
 * { word: frictionScore } for the flame.
 * Logged in: the server's session-aware scores (refetched when the attempt queue
 * drains after a flush). Anonymous: computed locally from the queued attempts.
 */
export function useStruggle() {
  const { isLoggedIn } = useAuth();
  const [scores, setScores] = useState({});

  useEffect(() => {
    let cancelled = false;

    if (!isLoggedIn) {
      const update = () => { if (!cancelled) setScores(frictionByWord(readQueue())); };
      update();
      const unsubscribe = subscribe(update);
      return () => { cancelled = true; unsubscribe(); };
    }

    const load = async () => {
      try {
        const rows = await getScores();
        if (!cancelled && Array.isArray(rows)) {
          setScores(Object.fromEntries(rows.map(r => [r.word, r.friction_score])));
        }
      } catch {
        // Offline or expired: keep the last known scores
      }
    };
    load();
    // The queue length drops to 0 right after a successful flush: pick up new scores
    const unsubscribe = subscribe(len => { if (len === 0) load(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [isLoggedIn]);

  return scores;
}
