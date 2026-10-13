import React, { useState } from 'react';
import { PlayIcon, SlowPlayIcon } from './AudioIcons';
import { TaskAltIcon } from './ActionIcons';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * Letters-only on-screen keyboard (no digits or symbols), so the phone's
 * native keyboard and its spell check never come into play.
 */
export default function VirtualKeyboard({ onChar, onBackspace, onEnter, enterDisabled, enterLabel = 'Check', onPlaySlow, onPlay }) {
  const [shift, setShift] = useState(false);

  const press = (c) => {
    onChar(shift ? c.toUpperCase() : c);
    setShift(false);
  };

  return (
    <div className="vkb" role="group" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={row} className={`vkb-row${r === 1 ? ' vkb-row-inset' : ''}`}>
          {r === 2 && (
            <button
              type="button"
              className={`vkb-key vkb-wide${shift ? ' vkb-on' : ''}`}
              onClick={() => setShift(s => !s)}
              aria-label="Shift"
              aria-pressed={shift}
            >⇧</button>
          )}
          {row.split('').map(c => (
            <button key={c} type="button" className="vkb-key" onClick={() => press(c)}>
              {shift ? c.toUpperCase() : c}
            </button>
          ))}
          {r === 2 && (
            <button type="button" className="vkb-key vkb-wide" onClick={onBackspace} aria-label="Delete">⌫</button>
          )}
        </div>
      ))}
      <div className="vkb-row">
        {onPlaySlow && (
          <button type="button" className="vkb-key vkb-audio" onClick={onPlaySlow} aria-label="Hear the word syllable by syllable"><SlowPlayIcon /></button>
        )}
        <button type="button" className="vkb-key vkb-space" onClick={() => onChar(' ')} aria-label="Space">space</button>
        <button type="button" className={`vkb-key vkb-enter${enterLabel === 'Check' ? ' vkb-enter-icon' : ''}`} onClick={onEnter} disabled={enterDisabled}
          aria-label={enterLabel}>{enterLabel === 'Check' ? <TaskAltIcon size="1.5rem" /> : enterLabel}</button>
        {onPlay && (
          <button type="button" className="vkb-key vkb-audio" onClick={onPlay} aria-label="Hear the word at normal speed"><PlayIcon /></button>
        )}
      </div>
    </div>
  );
}
