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
 * Compute the displayed stage level for each history entry.
 *
 * Uses look-forward: entry i's result-level is attempts[i+1].level (what stage the next
 * attempt started at). For the last entry, uses `currentLevel` from the word's live state.
 *
 * Extra rule: a checkmark (stage 5) implies "nailed it." When pct < 100 the student
 * didn't nail it, so the ball is capped at level 4 (full circle) regardless of the
 * actual post-attempt level. This keeps the checkmark from appearing on wrong answers.
 */
export function computeDisplayLevels(attempts = [], currentLevel = null) {
  return attempts.map((entry, idx) => {
    let level;
    if (idx < attempts.length - 1) {
      level = attempts[idx + 1].level;
    } else {
      level = currentLevel !== null && currentLevel !== undefined ? currentLevel : entry.level;
    }
    // Never show a checkmark for a wrong answer
    if (entry.pct < 100 && level >= 5) level = 4;
    return level;
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest is outlined).
 * Shape: the ball fill reflects the post-attempt stage level. A checkmark (stage 5)
 *        only appears when pct was 100% — wrong answers at stage 5 show a full
 *        circle (stage 4) instead.
 * Color: green = passed (pct 100%), yellow = 1st failure, red = 2+ consecutive failures.
 */
export default function ProgressBars({ attempts = [], currentLevel = null }) {
  if (!attempts.length) return null;
  const colors = computeTrendColors(attempts);
  const displayLevels = computeDisplayLevels(attempts, currentLevel);
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
