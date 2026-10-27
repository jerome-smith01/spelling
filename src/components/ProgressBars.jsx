import React from 'react';
import StageBall from './StageBall';

/**
 * Compute trend colors for attempt history:
 * - Any increase in stage level: green
 * - First attempt: green
 * - Same stage level: green (resets consecutive drop counter)
 * - First decrease in stage level: yellow
 * - Two or more consecutive decreases: red
 * - Any subsequent increase: green (resets consecutive drop counter)
 */
export function computeTrendColors(attempts = []) {
  let consecutiveDrops = 0;
  return attempts.map((curr, idx) => {
    if (idx === 0) {
      consecutiveDrops = 0;
      return 'var(--progress-increase)';
    }
    const prev = attempts[idx - 1];
    if (curr.level > prev.level) {
      consecutiveDrops = 0;
      return 'var(--progress-increase)';
    }
    if (curr.level < prev.level) {
      consecutiveDrops += 1;
      return consecutiveDrops >= 2 ? 'var(--progress-drop-2)' : 'var(--progress-drop-1)';
    }
    // Same level: green, resets drop counter
    consecutiveDrops = 0;
    return 'var(--progress-increase)';
  });
}

/**
 * Attempt history for one word: a StageBall (Harvey ball) per attempt, oldest to newest
 * (the newest is outlined).
 * Stage 1-4 fill 1-4 quarters; stage 5 is a check circle.
 * Icons are colored by trend: green for increase/neutral, yellow for first drop, red for 2+ consecutive drops.
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
