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
  it('shows a left-out letter as a missing box', async () => {
    const user = userEvent.setup();
    setup({ words: [{ id: 1, word: 'annoy', syllables: [['a', 'n', 'n', 'o', 'y']] }] });
    await user.type(screen.getByLabelText('Type the word you heard'), 'anoy');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const row = screen.getByLabelText('You spelled anoy');
    expect(row.children).toHaveLength(5);
    expect(row.querySelectorAll('.quiz-letter-missing')).toHaveLength(1);
    expect(row.querySelector('.quiz-letter-missing')).toHaveTextContent('n');
  });

  it('restores progress after a refresh', async () => {
    const user = userEvent.setup();
    setup();
    await answer(user, 'alpha');
    await user.type(screen.getByLabelText('Type the word you heard'), 'bra');
    cleanup(); // simulate a refresh
    setup();
    expect(screen.getByLabelText('Word 2 of 5: current')).toBeInTheDocument();
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
    expect(screen.getAllByRole('img', { name: 'Tested out' })).toHaveLength(3);
    expect(screen.getAllByRole('img', { name: 'Not tested out' })).toHaveLength(2);
    expect(screen.queryByText(/Tested out! This word|back in practice/)).toBeNull();
    expect(screen.getByLabelText('The word is delta')).toHaveClass('quiz-wordbox');
    await user.click(screen.getByRole('button', { name: 'Test the 3 hardest words' }));
    expect(screen.getByLabelText('Word 1 of 3: current')).toBeInTheDocument();
  });

  it('ranks the hardest words by their last five attempts', async () => {
    const user = userEvent.setup();
    const hist = { alpha: [0, 0, 0, 0], bravo: [100, 100, 100, 100] }; // alpha struggles over time
    setup({ historyFor: (w) => (hist[w] || []).map(pct => ({ pct })) });
    for (const w of ['alpha', 'bravo', 'candy', 'delta', 'eagle']) await answer(user, w); // all right today
    expect(screen.getByText(/Hardest \(last 5 attempts\): alpha 20%/)).toBeInTheDocument();
  });

  it('with nothing missed, Finish is the main button and exits', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    setup({ onExit });
    for (const w of ['alpha', 'bravo', 'candy', 'delta', 'eagle']) await answer(user, w);
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onExit).toHaveBeenCalled();
  });

  it('plays each new word at the speed the student last chose', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSpeak = vi.fn(); const onSpeakSyllables = vi.fn(); const onSpeakBoth = vi.fn();
    setup({ onSpeak, onSpeakSyllables, onSpeakBoth });
    await user.click(screen.getByRole('button', { name: 'Hear the word syllable by syllable' }));
    await vi.advanceTimersByTimeAsync(400); // the first word's own auto-play
    onSpeak.mockClear(); onSpeakSyllables.mockClear();
    await user.type(screen.getByLabelText('Type the word you heard'), 'alpha');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Next word' }));
    await vi.advanceTimersByTimeAsync(400);
    expect(onSpeakSyllables).toHaveBeenCalledTimes(1);
    expect(onSpeak).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Hear the word at normal speed, then slowly' }));
    expect(localStorage.getItem('spelling_tutor_quiz_speed_v1')).toBe('both');
    vi.useRealTimers();
  });

  it('offers to retake everything when nothing was missed', async () => {
    const user = userEvent.setup();
    setup();
    for (const w of ['alpha', 'bravo', 'candy', 'delta', 'eagle']) await answer(user, w);
    expect(screen.queryByRole('button', { name: /Retake missed/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retake all words (5)' }));
    expect(screen.getByLabelText('Word 1 of 5: current')).toBeInTheDocument();
  });
});
