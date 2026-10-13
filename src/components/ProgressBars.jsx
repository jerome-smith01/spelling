import React from 'react';

const MIN_H = 8;
const MAX_H = 38;

/**
 * Attempt history for one word: a bar per attempt, oldest to newest (the newest is
 * outlined). Height = the score; shade = the stage the attempt was made at.
 */
export default function ProgressBars({ attempts = [] }) {
  if (!attempts.length) return null;
  const summary = attempts.map(a => `${a.pct}% at stage ${a.level}`).join(', ');
  return (
    <div className="progress-bars" role="img" aria-label={`Last ${attempts.length} attempts, oldest to newest: ${summary}`}>
      {attempts.map((a, i) => (
        <i
          key={i}
          className={i === attempts.length - 1 ? 'is-latest' : undefined}
          style={{
            height: `${Math.round(MIN_H + (Math.max(0, Math.min(100, a.pct)) / 100) * (MAX_H - MIN_H))}px`,
            background: `var(--stage-${Math.max(1, Math.min(5, a.level))})`
          }}
        />
      ))}
    </div>
  );
}
