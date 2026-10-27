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
 * Compute the post-attempt stage level for each history entry using look-forward.
 *
 * Each entry stores `level` as the stage *before* the attempt. To show the stage the
 * word ended up at (e.g. stage 4 after dropping from 5), we look at the next entry's
 * level. For the last entry, the caller supplies `currentLevel` (the word's level today).
 * Falls back to the entry's own level when no look-ahead is available.
 */
export function computePostLevels(attempts = [], currentLevel = null) {
  return attempts.map((entry, idx) => {
    if (idx < attempts.length - 1) {
      return attempts[idx + 1].level;   // next entry's start-level = this entry's result-level
    }
    // Last entry: use current word state level if supplied
    return currentLevel !== null && currentLevel !== undefined ? currentLevel : entry.level;
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest is outlined).
 * Shape: the ball's fill reflects the stage the word ended up at AFTER the attempt
 *        (not the stage it was at before), so a drop from 5→4 shows a full circle,
 *        not a checkmark. Pass `currentLevel` (progress.words[word].level) so the
 *        last ball can be shaped correctly.
 * Color: green = passed (pct 100%), yellow = 1st failure, red = 2+ consecutive failures.
 */
export default function ProgressBars({ attempts = [], currentLevel = null }) {
  if (!attempts.length) return null;
  const colors = computeTrendColors(attempts);
  const postLevels = computePostLevels(attempts, currentLevel);
  const summary = attempts.map(a => `${a.pct}% at stage ${a.level}`).join(', ');
  return (
    <div className="progress-bars" role="img" aria-label={`Last ${attempts.length} attempts, oldest to newest: ${summary}`}>
      {attempts.map((a, i) => (
        <div key={i} className={`progress-col${i === attempts.length - 1 ? ' is-latest' : ''}`}>
          <StageBall level={postLevels[i]} size={18} color={colors[i]} />
        </div>
      ))}
    </div>
  );
}
