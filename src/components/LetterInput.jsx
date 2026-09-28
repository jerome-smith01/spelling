import React from 'react';

export default function LetterInput({
  value = '',
  onChange,
  onAdvance,
  onBackspace,
  inputRef,
  ariaLabel,
  validationState = 'neutral'
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && value === '') {
      e.preventDefault();
      onBackspace();
    }
  };

  const handleFocus = (e) => {
    // Select any existing letter so the next keystroke overwrites it,
    // instead of requiring the student to move right + backspace.
    e.target.select();
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    // Take the newest character typed
    const char = raw.slice(-1).toLowerCase();

    // Only allow letters
    if (char && !/^[a-z]$/.test(char)) {
      return;
    }

    onChange(char);
    if (char) {
      onAdvance();
    }
  };

  let stateClass = '';
  if (validationState === 'correct') stateClass = 'correct';
  if (validationState === 'incorrect') stateClass = 'incorrect';

  return (
    <div className={`letter-box input-mode ${stateClass}`}>
      <input
        ref={inputRef}
        type="text"
        maxLength={2}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onClick={handleFocus}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
        aria-label={ariaLabel}
        className="letter-input"
      />
    </div>
  );
}
