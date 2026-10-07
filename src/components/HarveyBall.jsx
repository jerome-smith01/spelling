import React from 'react';

/**
 * Harvey ball: a ring with 0-4 quarters filled in traffic-light green.
 * Never used alone: callers pair it with text ("Level 2 of 4"), and `label`
 * becomes the accessible name (omit it when the text beside it says the same).
 */
export default function HarveyBall({ quarters = 0, size = 18, label }) {
  const q = Math.max(0, Math.min(4, Math.round(quarters)));
  const r = 7;
  const c = 9;
  let fill = null;
  if (q === 4) {
    fill = <circle cx={c} cy={c} r={r} fill="var(--harvey-fill)" />;
  } else if (q > 0) {
    // Wedge clockwise from 12 o'clock
    const a = (q / 4) * 2 * Math.PI;
    const x = c + r * Math.sin(a);
    const y = c - r * Math.cos(a);
    fill = <path d={`M${c},${c} L${c},${c - r} A${r},${r} 0 ${q > 2 ? 1 : 0} 1 ${x},${y} Z`} fill="var(--harvey-fill)" />;
  }
  return (
    <svg
      className="harvey-ball"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-quarters={q}
    >
      <circle cx={c} cy={c} r={r} fill="var(--card-bg)" />
      {fill}
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--harvey-ring)" strokeWidth="1.6" />
    </svg>
  );
}
