// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import QuizView from './QuizView';

// These tests move through results instantly; the review gate (which treats that as rushing) is off unless a test turns it on
const mockGate = vi.hoisted(() => ({ rushed: false }));
vi.mock('../utils/reviewPolicy', async (importOriginal) => ({ ...(await importOriginal()), isRushed: () => mockGate.rushed }));

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
  it('Enter checks the word, then Enter again moves to the next word', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Type the word you heard'), 'alpha{Enter}');
    expect(screen.getByLabelText('You spelled alpha')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Word 2 of 5: current')).toBeInTheDocument();
    expect(screen.getByLabelText('Type the word you heard')).toHaveValue('');
  });

  it('after drilling the hardest 3, offers the next 3 and the remaining missed words', async () => {
    const user = userEvent.setup();
    const names = ['apple', 'berry', 'cherry', 'damson', 'elder', 'figs', 'grape', 'honey'];
    const words = names.map((w, i) => ({ id: i, word: w, syllables: [w.split('')] }));
    setup({ words });
    for (const w of names) await answer(user, names.indexOf(w) < 5 ? 'x' : w); // first five wrong
    await user.click(screen.getByRole('button', { name: 'Test the 3 hardest words' }));
    for (const w of ['apple', 'berry', 'cherry']) await answer(user, w);
    expect(screen.getByRole('button', { name: 'Practice remaining missed words (2)' })).toBeInTheDocument();
    // left: damson and elder (missed) and three right words, which are not hard
    await user.click(screen.getByRole('button', { name: 'Next 2 hardest words' }));
    expect(screen.getByLabelText('Word 1 of 2: current')).toBeInTheDocument();
  });

  it('the slider changes how many hardest words are tested, and shows them', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const user = userEvent.setup();
    const names = ['apple', 'berry', 'cherry', 'damson', 'elder'];
    setup({ words: names.map((w, i) => ({ id: i, word: w, syllables: [w.split('')] })) });
    for (const w of names) await answer(user, 'x');
    expect(screen.getByLabelText('Hardest words').children).toHaveLength(3);
    fireEvent.change(screen.getByRole('slider', { name: 'How many of the hardest words' }), { target: { value: '5' } });
    expect(screen.getByLabelText('Hardest words').children).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: 'Test the 5 hardest words' }));
    expect(screen.getByLabelText('Word 1 of 5: current')).toBeInTheDocument();
  });

  it('the not-yet-learned slider picks how many words and shows them', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const user = userEvent.setup();
    const names = ['apple', 'berry', 'cherry', 'damson', 'elder'];
    setup({ words: names.map((w, i) => ({ id: i, word: w, syllables: [w.split('')] })) });
    for (const w of names) await answer(user, 'x');
    expect(screen.getByLabelText('Not yet learned words').children).toHaveLength(3); // starts at 3 at most
    fireEvent.change(screen.getByRole('slider', { name: 'How many not yet learned words' }), { target: { value: '5' } });
    expect(screen.getByLabelText('Not yet learned words').children).toHaveLength(5);
    fireEvent.change(screen.getByRole('slider', { name: 'How many not yet learned words' }), { target: { value: '2' } });
    expect(screen.getByLabelText('Not yet learned words').children).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Not yet learned (2)' }));
    expect(screen.getByLabelText('Word 1 of 2: current')).toBeInTheDocument();
  });

  it('leaving a missed word too fast opens the review popup first; after it, Next goes through', async () => {
    mockGate.rushed = true;
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByLabelText('Type the word you heard'), 'x');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'Next word' }));
    expect(screen.getByRole('alertdialog', { name: 'Take time to review your work.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Word 1 of 5: current')).toBeInTheDocument(); // did not advance
    await user.click(screen.getByRole('button', { name: /OK/ }));
    await new Promise(r => setTimeout(r, 350)); // the same click must not also count as "next"
    await user.click(screen.getByRole('button', { name: 'Next word' }));
    expect(screen.getByLabelText('Word 2 of 5: current')).toBeInTheDocument();
    mockGate.rushed = false;
  });

  it('levels follow the session, not the word: 1st rushed miss is level 1, 2nd is level 2, a new round starts over', async () => {
    mockGate.rushed = true;
    const user = userEvent.setup();
    setup();
    const rushPast = async () => {
      await user.type(screen.getByLabelText('Type the word you heard'), 'x');
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: 'Next word' }));
    };
    const finishPopup = async (btn) => { await user.click(btn); await new Promise(r => setTimeout(r, 350)); await user.click(screen.getByRole('button', { name: 'Next word' })); };
    await rushPast();                                   // word 1: level 1
    expect(within(screen.getByRole('alertdialog')).queryByRole('group', { name: 'Your spelling' })).toBeNull();
    await finishPopup(screen.getByRole('button', { name: /OK/ }));
    await rushPast();                                   // word 2 (a different word): level 2
    expect(screen.getByText('Tap the wrong letter.')).toBeInTheDocument();
    mockGate.rushed = false;
  });

  it('a right answer is never gated', async () => {
    mockGate.rushed = true;
    const user = userEvent.setup();
    setup();
    await answer(user, 'alpha');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByLabelText('Word 2 of 5: current')).toBeInTheDocument();
    mockGate.rushed = false;
  });

  it('shows a left-out letter as a missing box', async () => {
    const user = userEvent.setup();
    setup({ words: [{ id: 1, word: 'annoy', syllables: [['a', 'n', 'n', 'o', 'y']] }] });
    await user.type(screen.getByLabelText('Type the word you heard'), 'anoy');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    const row = screen.getByLabelText('You spelled anoy');
    expect(row.children).toHaveLength(5);
    expect(row.querySelectorAll('.quiz-letter-missing')).toHaveLength(1);
    expect(row.querySelector('.quiz-letter-missing')).toBeEmptyDOMElement();
    expect(row).toHaveTextContent('anoy');
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
    // only the two missed words are hard; the three right ones (100%) are left out
    expect(screen.getByLabelText('Hardest words').children).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Test the 2 hardest words' }));
    expect(screen.getByLabelText('Word 1 of 2: current')).toBeInTheDocument();
  });

  it('ranks the hardest words by their last five attempts', async () => {
    const user = userEvent.setup();
    const hist = { alpha: [0, 0, 0, 0], bravo: [100, 100, 100, 100] }; // alpha struggles over time
    setup({ historyFor: (w) => (hist[w] || []).map(pct => ({ pct })) });
    for (const w of ['alpha', 'bravo', 'candy', 'delta', 'eagle']) await answer(user, w); // all right today
    expect(screen.getByText('alpha 20%')).toBeInTheDocument();
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
