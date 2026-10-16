import React from 'react';
import { alignCells } from '../utils/schedule';

/**
 * A spelling as letter boxes: green = right letter, solid red = wrong or surplus letter,
 * empty dashed red = a letter that was left out. Takes the cells of utils/reviewCells.js
 * ({ ch, ok, fix }) or the older alignment cells ({ ch, kind }).
 */
export function LetterBoxes({ cells, label }) {
  return (
    <div className="quiz-letters" role="img" aria-label={label}>
      {cells.map((c, i) => {
        const ok = c.ok ?? c.kind === 'ok';
        const missing = !ok && (c.kind === 'missing' || !c.ch);
        return (
          <span key={i} className={`quiz-letter ${ok ? 'quiz-letter-ok' : missing ? 'quiz-letter-bad quiz-letter-missing' : 'quiz-letter-bad'}`}>
            {missing ? '' : c.ch}
          </span>
        );
      })}
    </div>
  );
}

/** Cells for a typed spelling, from either the saved cells or by lining it up against the word. */
export const cellsOf = (saved, typed, word) => saved || alignCells(typed, word);

/**
 * The per-word result, the same in the quiz and in practice: "Your spelling" (letter boxes) above
 * "Correct spelling" (the word in one green box). No explanatory text.
 */
export default function SpellingResult({ cells, word, typed, correct }) {
  return (
    <div className="quiz-result" aria-live="polite">
      <fieldset className={`quiz-box ${correct ? 'quiz-box-right' : 'quiz-box-wrong'}`}>
        <legend>
          <span className={`quiz-icon ${correct ? 'quiz-icon-right' : 'quiz-icon-wrong'}`} aria-hidden="true">{correct ? '✓' : '✕'}</span>
          Your spelling
        </legend>
        {cells.some(c => c.ch || c.ok)
          ? <LetterBoxes cells={cells} label={`You spelled ${typed ?? cells.map(c => c.ch).join('')}`} />
          : <div className="quiz-review-empty">(nothing typed)</div>}
      </fieldset>
      <fieldset className="quiz-box quiz-box-right">
        <legend><span className="quiz-icon quiz-icon-right" aria-hidden="true">✓</span>Correct spelling</legend>
        <div className="quiz-answer quiz-right" aria-label={`The word is ${word}`}>{word}</div>
      </fieldset>
    </div>
  );
}
