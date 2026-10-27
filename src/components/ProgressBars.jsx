import React from 'react';
import StageBall from './StageBall';

/**
 * Compute trend colors for attempt history.
 *
 * Uses `pct` from each entry as the reliable signal:
 *   - pct === 100 → passed → green (also resets the failure streak)
 *   - pct < 100, first failure in a streak → yellow
 *   - pct < 100, two or more consecutive failures → red
 *
 * This avoids the timing/look-forward complexity of comparing `level` values,
 * since `level` is stored *before* the result is applied and a "stay" outcome
 * leaves the level unchanged even when the user misspelled.
 */
export function computeTrendColors(attempts = []) {
  let consecutiveFailures = 0;
  return attempts.map(entry => {
    if (entry.pct >= 100) {
      consecutiveFailures = 0;
      return 'var(--progress-increase)';
    }
    consecutiveFailures += 1;
    return consecutiveFailures >= 2 ? 'var(--progress-drop-2)' : 'var(--progress-drop-1)';
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest is outlined).
 * Stage 1-4 fill 1-4 quarters; stage 5 is a check circle.
 * Colors: green = passed (pct 100%), yellow = 1st failure, red = 2+ consecutive failures.
 */
export default function ProgressBars({ attempts = [] }) {
  if (!attempts.length) return null;
  const colors = computeTrendColors(attempts);
  const summary = attempts.map(a => `${a.pct}% at stage ${a.level}`).join(', ');
  return (
    <div className="progress-bars" role="img" aria-label={`Last ${attempts.length} attempts, oldest to newest: ${summary}`}>
      {attempts.map((a, i) => (
        <div key={i} className={`progress-col${i === attempts.length - 1 ? ' is-latest' : ''}`}>
          <StageBall level={a.level} size={18} color={colors[i]} />
        </div>
      ))}
    </div>
  );
}
