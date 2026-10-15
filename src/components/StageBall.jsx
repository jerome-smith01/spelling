import React from 'react';
import { TaskAltIcon } from './ActionIcons';

/**
 * Stage Harvey ball: stage 1-4 fill 1-4 quarters (shade grows with the stage, see --stage-N
 * in spelling.css); stage 5 (the audio quiz, the last stage) is a check circle.
 */
export default function StageBall({ level, size = 22, label }) {
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  if (lv === 5) {
    return (
      <span className="stage-ball stage-ball-done" style={{ color: 'var(--stage-5)' }}
        role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <TaskAltIcon size={size} />
      </span>
    );
  }
  const r = 7;
  const c = 9;
  const color = `var(--stage-${lv})`;
  let fill;
  if (lv === 4) {
    fill = <circle cx={c} cy={c} r={r} fill={color} />;
  } else {
    const a = (lv / 4) * 2 * Math.PI;
    const x = c + r * Math.sin(a);
    const y = c - r * Math.cos(a);
    fill = <path d={`M${c},${c} L${c},${c - r} A${r},${r} 0 ${lv > 2 ? 1 : 0} 1 ${x},${y} Z`} fill={color} />;
  }
  return (
    <svg className="stage-ball" width={size} height={size} viewBox="0 0 18 18" focusable="false"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx={c} cy={c} r={r} fill="var(--card-bg)" />
      {fill}
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}
