// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import QuizView from './QuizView';

const WORDS = ['alpha', 'bravo', 'candy', 'delta', 'eagle'].map((w, i) => ({ id: i, word: w, syllables: [w.split('')] }));
const KEY = 'quiz_test_key';

const setup = (props = {}) => render(
  <QuizView words={WORDS} onSpeak={() => {}} onAttempts={() => {}} onExit={() => {}}
    commitQuiz={(w, pct) => ({ testedOut: pct === 100 })} storageKey={KEY} {...props} />
);

const answer = async (user, typed) => {
  await user.type(screen.getByLabelText('Type the word you heard'), typed);
  await user.click(screen.getByRole('button', { name: 'Check' }));
  await user.click(screen.getByRole('button', { name: /Next word|See results/ }));
};

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.99); localStorage.clear(); }); // keeps word order
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('QuizView', () => {
  it('restores progress after a refresh', async () => {
    const user = userEvent.setup();
    setup();
    await answer(user, 'alpha');
    await user.type(screen.getByLabelText('Type the word you heard'), 'bra');
    cleanup(); // simulate a refresh
    setup();
    expect(screen.getByText('Word 2 of 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Type the word you heard')).toHaveValue('bra');
  });

  it('shows the grade and offers the 3 hardest words', async () => {
    const user = userEvent.setup();
    setup();
    await answer(user, 'alpha');
    await answer(user, 'bravo');
    await answer(user, 'candy');
    await answer(user, 'dlt');
    await answer(user, 'e');
    expect(screen.getByRole('status', { name: /Quiz grade/ })).toBeInTheDocument();
    expect(screen.getByLabelText('The word is delta')).toHaveClass('quiz-wordbox');
    await user.click(screen.getByRole('button', { name: 'Test the 3 hardest words' }));
    expect(screen.getByText('Word 1 of 3')).toBeInTheDocument();
  });

  it('offers to retake everything when nothing was missed', async () => {
    const user = userEvent.setup();
    setup();
    for (const w of ['alpha', 'bravo', 'candy', 'delta', 'eagle']) await answer(user, w);
    expect(screen.queryByRole('button', { name: /Retake missed/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retake all words (5)' }));
    expect(screen.getByText('Word 1 of 5')).toBeInTheDocument();
  });
});
