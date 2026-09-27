import React from 'react';
import { FLAME_THRESHOLD } from '../utils/friction';

/** Flame on words the student keeps missing. Renders nothing below the threshold. */
export default function StruggleIndicator({ friction = 0, word }) {
  if (friction < FLAME_THRESHOLD) return null;
  return (
    <span
      className="struggle-flame"
      role="img"
      aria-label={`Tricky word: ${word}. Keep practicing!`}
      title="Tricky word. Keep practicing!"
    >
      🔥
    </span>
  );
}
