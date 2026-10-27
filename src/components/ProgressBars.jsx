import React from 'react';
import StageBall from './StageBall';

/**
 * Compute trend colors for attempt history.
 *
 * Uses `pct` from each entry as the reliable signal:
 *   - pct === 100 → passed → green (also resets the failure streak)
 *   - pct < 100, first failure in a streak → yellow
 *   - pct < 100, two or more consecutive failures → red
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
 * Compute the displayed stage level for each history entry.
 *
 * New entries (written by applyResult after this fix) include `nextLevel`, the stage the
 * word ended up at *after* the attempt. Older entries without `nextLevel` fall back to
 * look-forward (next entry's pre-level), and ultimately to the pre-level itself.
 *
 * Cap rule: a checkmark (stage 5) implies "nailed it." Wrong answers (pct < 100) are
 * capped at level 4 (full circle) so a "stay at 5" misspell doesn't show a checkmark.
 */
export function computeDisplayLevels(attempts = []) {
  return attempts.map((entry, idx) => {
    let level;

    if (entry.nextLevel !== undefined) {
      // Preferred path: post-attempt level stored at write time — always correct.
      level = entry.nextLevel;
    } else if (idx < attempts.length - 1) {
      // Legacy fallback for old entries: look forward to next entry's pre-level.
      level = attempts[idx + 1].level;
    } else {
      // Last old entry: no reliable data, show pre-level.
      level = entry.level;
    }

    // Never show a checkmark for a wrong answer.
    if (entry.pct < 100 && level >= 5) level = 4;

    return level;
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest has a grey ring outline).
 * Shape: post-attempt stage level (from entry.nextLevel, written by applyResult).
 * Color: green = passed (pct 100%), yellow = 1st failure, red = 2+ consecutive failures.
 */
export default function ProgressBars({ attempts = [] }) {
  if (!attempts.length) return null;
  const colors = computeTrendColors(attempts);
  const displayLevels = computeDisplayLevels(attempts);
  const summary = attempts.map(a => `${a.pct}% at stage ${a.level}`).join(', ');
  return (
    <div className="progress-bars" role="img" aria-label={`Last ${attempts.length} attempts, oldest to newest: ${summary}`}>
      {attempts.map((a, i) => (
        <div key={i} className={`progress-col${i === attempts.length - 1 ? ' is-latest' : ''}`}>
          <StageBall level={displayLevels[i]} size={18} color={colors[i]} />
        </div>
      ))}
    </div>
  );
}
