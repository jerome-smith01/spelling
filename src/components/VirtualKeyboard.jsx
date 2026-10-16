import React, { useState } from 'react';
import { PlayIcon, SlowPlayIcon, BothSpeedIcon } from './AudioIcons';
import { TaskAltIcon, ChevronLeftIcon, ChevronRightIcon } from './ActionIcons';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * Letters-only on-screen keyboard (no digits or symbols), so the phone's
 * native keyboard and its spell check never come into play.
 */
export default function VirtualKeyboard({ onChar, onBackspace, onEnter, enterDisabled, enterLabel = 'Check', onPlaySlow, onPlay, onPlayBoth, onPrev, prevDisabled, onNext, nextLabel = 'Next card', defaultSpeed }) {
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
        {onPlay && (
          <button type="button" className={`vkb-key vkb-audio${defaultSpeed === 'normal' ? ' is-default' : ''}`} onClick={onPlay} aria-label="Hear the word at normal speed"><PlayIcon /></button>
        )}
        {onPlaySlow && (
          <button type="button" className={`vkb-key vkb-audio${defaultSpeed === 'slow' ? ' is-default' : ''}`} onClick={onPlaySlow} aria-label="Hear the word syllable by syllable"><SlowPlayIcon /></button>
        )}
        {onPlayBoth && (
          <button type="button" className={`vkb-key vkb-audio${defaultSpeed === 'both' ? ' is-default' : ''}`} onClick={onPlayBoth} aria-label="Hear the word at normal speed, then slowly"><BothSpeedIcon size="1em" /></button>
        )}
        <button type="button" className={`vkb-key vkb-enter${enterLabel === 'Check' ? ' vkb-enter-icon' : ''}`} onClick={onEnter} disabled={enterDisabled}
          aria-label={enterLabel}>{enterLabel === 'Check' ? <TaskAltIcon size="1.5rem" /> : enterLabel}</button>
        {onPrev && (
          <button type="button" className="vkb-key vkb-nav" onClick={onPrev} disabled={prevDisabled} aria-label="Back to the previous card"><ChevronLeftIcon /></button>
        )}
        {onNext && (
          <button type="button" className="vkb-key vkb-nav" onClick={onNext} aria-label={nextLabel}><ChevronRightIcon /></button>
        )}
      </div>
    </div>
  );
}
