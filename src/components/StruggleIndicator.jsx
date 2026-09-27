import React from 'react';
import { FLAME_THRESHOLD } from '../utils/friction';

/**
 * Flame on words the student keeps missing. Renders nothing below the threshold.
 * With `onClick` it becomes a button that opens the coaching tip.
 */
export default function StruggleIndicator({ friction = 0, word, onClick }) {
  if (friction < FLAME_THRESHOLD) return null;

  if (onClick) {
    return (
      <button
        type="button"
        className="struggle-flame struggle-flame-btn"
        onClick={onClick}
        aria-label={`Tricky word: ${word}. Tap for a tip.`}
        title="Tricky word. Tap for a tip!"
      >
        🔥
      </button>
    );
  }
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
