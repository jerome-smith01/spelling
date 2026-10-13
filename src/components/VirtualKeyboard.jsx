import React, { useState } from 'react';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * Letters-only on-screen keyboard (no digits or symbols), so the phone's
 * native keyboard and its spell check never come into play.
 */
export default function VirtualKeyboard({ onChar, onBackspace, onEnter, enterDisabled, enterLabel = 'Check' }) {
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
        <button type="button" className="vkb-key vkb-space" onClick={() => onChar(' ')} aria-label="Space">space</button>
        <button type="button" className="vkb-key vkb-enter" onClick={onEnter} disabled={enterDisabled}>{enterLabel}</button>
      </div>
    </div>
  );
}
