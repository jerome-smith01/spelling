import React from 'react';
import StageBall from './StageBall';

const MIN_H = 8;
const MAX_H = 38;

/**
 * Attempt history for one word: a bar per attempt, oldest to newest (the newest is
 * outlined). Height = the score; the stage ball below each bar is the stage it was made at,
 * so a change between neighbours shows where the word advanced.
 */
export default function ProgressBars({ attempts = [] }) {
  if (!attempts.length) return null;
  const summary = attempts.map(a => `${a.pct}% at stage ${a.level}`).join(', ');
  return (
    <div className="progress-bars" role="img" aria-label={`Last ${attempts.length} attempts, oldest to newest: ${summary}`}>
      {attempts.map((a, i) => (
        <div key={i} className="progress-col">
          <div className="progress-slot"><i
            className={i === attempts.length - 1 ? 'is-latest' : undefined}
            style={{
              height: `${Math.round(MIN_H + (Math.max(0, Math.min(100, a.pct)) / 100) * (MAX_H - MIN_H))}px`,
              background: `var(--stage-${Math.max(1, Math.min(5, a.level))})`
            }}
          /></div>
          <StageBall level={a.level} size={18} />
        </div>
      ))}
    </div>
  );
}
