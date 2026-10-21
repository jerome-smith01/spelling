// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SpellingResult, { LetterBoxes, cellsOf } from './SpellingResult';
import { alignCells } from '../utils/schedule';

describe('SpellingResult and LetterBoxes', () => {
  it('renders standard result with "Your spelling" and "Correct spelling"', () => {
    const word = 'cat';
    const typed = 'cat';
    const cells = alignCells(typed, word);

    render(<SpellingResult cells={cells} word={word} typed={typed} correct={true} />);

    expect(screen.getByText('Your spelling')).toBeInTheDocument();
    expect(screen.getByText('Correct spelling')).toBeInTheDocument();
    expect(screen.getByLabelText('The word is cat')).toHaveTextContent('cat');
  });

  it('renders long words (15+ letters) properly in letter boxes', () => {
    const word = 'congratulations';
    const typed = 'congratulashuns';
    const cells = alignCells(typed, word);

    const { container } = render(
      <SpellingResult cells={cells} word={word} typed={typed} correct={false} />
    );

    const quizLetters = container.querySelector('.quiz-letters');
    expect(quizLetters).toBeInTheDocument();
    // Letters should be individually rendered inside .quiz-letter elements
    const letterBoxes = container.querySelectorAll('.quiz-letter');
    expect(letterBoxes.length).toBeGreaterThanOrEqual(word.length);

    // Has right and wrong letter styling
    expect(container.querySelectorAll('.quiz-letter-ok').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.quiz-letter-bad').length).toBeGreaterThan(0);
  });

  it('handles empty typed input gracefully', () => {
    const word = 'dog';
    render(<SpellingResult cells={[]} word={word} typed="" correct={false} />);
    expect(screen.getByText('(nothing typed)')).toBeInTheDocument();
  });

  it('LetterBoxes sets accessible label matching typed letters', () => {
    const cells = [
      { ch: 'b', ok: true },
      { ch: 'e', ok: true },
      { ch: 'd', ok: true }
    ];
    render(<LetterBoxes cells={cells} label="You spelled bed" />);
    expect(screen.getByRole('img', { name: 'You spelled bed' })).toBeInTheDocument();
  });
});
