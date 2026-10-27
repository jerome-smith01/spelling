import React from 'react';
import StageBall from './StageBall';

/**
 * Compute trend colors for attempt history.
 *
 * Each history entry stores { pct, level } where `level` is the stage the word was at
 * *before* the attempt result was applied. To know what happened after attempt i,
 * we look at attempts[i+1].level (what stage the user started the next attempt at).
 * For the final entry, the caller must supply `currentLevel` (the word's level today,
 * after all results have been applied).
 *
 * Rules:
 *   - Increased stage → green
 *   - First decrease → yellow
 *   - Two or more consecutive decreases → red
 *   - An increase (or same level) resets the streak → green
 */
export function computeTrendColors(attempts = [], currentLevel = null) {
  if (!attempts.length) return [];

  // Determine the post-attempt direction for each entry using look-forward.
  const directions = attempts.map((entry, idx) => {
    const levelBefore = entry.level;
    const levelAfter =
      idx < attempts.length - 1
        ? attempts[idx + 1].level   // next entry's start-level = this attempt's result level
        : currentLevel;             // for the last entry, use the current word level

    if (levelAfter === null || levelAfter === undefined) return 'neutral';
    if (levelAfter > levelBefore) return 'increase';
    if (levelAfter < levelBefore) return 'decrease';
    return 'neutral';
  });

  let consecutiveDrops = 0;
  return directions.map(dir => {
    if (dir === 'increase' || dir === 'neutral') {
      consecutiveDrops = 0;
      return 'var(--progress-increase)';
    }
    consecutiveDrops += 1;
    return consecutiveDrops >= 2 ? 'var(--progress-drop-2)' : 'var(--progress-drop-1)';
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest is outlined).
 * Stage 1-4 fill 1-4 quarters; stage 5 is a check circle.
 * Icons are colored by trend: green for increase/neutral, yellow for first drop, red for 2+ consecutive drops.
 * `currentLevel` must be the word's level today (after the latest result) so the last ball
 * is colored correctly; without it, the last entry will always appear green.
 */
export default function ProgressBars({ attempts = [], currentLevel = null }) {
  if (!attempts.length) return null;
  const colors = computeTrendColors(attempts, currentLevel);
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
