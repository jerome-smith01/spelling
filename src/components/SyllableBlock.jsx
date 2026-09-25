import React from 'react';
import LetterInput from './LetterInput';

export default function SyllableBlock({
  syllables,
  hiddenIndices,
  userInputs,
  validationResults,
  onInputChange,
  inputRefs,
  hiddenSequence,
  word
}) {
  return (
    <div className="syllables-wrapper">
      {syllables.map((syllableLetters, sylIdx) => (
        <React.Fragment key={sylIdx}>
          <div className="syllable-group">
            {syllableLetters.map(item => {
              const isHidden = hiddenIndices.has(item.index);

              if (isHidden) {
                // Find where this letter sits in the sequence of hidden inputs for auto-advance/backspace
                const seqPos = hiddenSequence.indexOf(item.index);
                const nextGlobalIndex = hiddenSequence[seqPos + 1];
                const prevGlobalIndex = hiddenSequence[seqPos - 1];

                const onAdvance = () => {
                  if (nextGlobalIndex !== undefined && inputRefs.current[nextGlobalIndex]) {
                    inputRefs.current[nextGlobalIndex].focus();
                  }
                };

                const onBackspace = () => {
                  if (prevGlobalIndex !== undefined && inputRefs.current[prevGlobalIndex]) {
                    // Clear the previous input value as specified in smart backspace
                    onInputChange(prevGlobalIndex, '');
                    inputRefs.current[prevGlobalIndex].focus();
                  }
                };

                const valState = validationResults ? validationResults[item.index] : 'neutral';

                return (
                  <LetterInput
                    key={item.index}
                    value={userInputs[item.index] || ''}
                    onChange={(char) => onInputChange(item.index, char)}
                    onAdvance={onAdvance}
                    onBackspace={onBackspace}
                    inputRef={(el) => { inputRefs.current[item.index] = el; }}
                    ariaLabel={`Letter ${item.index + 1} of word ${word}`}
                    validationState={valState}
                  />
                );
              }

              return (
                <div key={item.index} className="letter-box">
                  {item.char}
                </div>
              );
            })}
          </div>

          {/* Syllable hyphen separator */}
          {sylIdx < syllables.length - 1 && (
            <span className="syllable-separator" aria-hidden="true">
              &bull;
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
