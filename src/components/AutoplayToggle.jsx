import React from 'react';

/** "Autoplay" label with a switch on its right; the same control sits in the same spot on both card faces. */
export default function AutoplayToggle({ checked, onChange }) {
  return (
    <span className="autoplay-toggle">
      <span aria-hidden="true">Autoplay</span>
      <button type="button" role="switch" className="switch" aria-checked={!!checked}
        aria-label="Autoplay" onClick={() => onChange(!checked)} />
    </span>
  );
}
