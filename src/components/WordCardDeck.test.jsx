// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false }) }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login' }));

import WordCardDeck from './WordCardDeck';
import { useDeckSchedule } from '../hooks/useDeckSchedule';
import { parseWordList } from '../utils/wordParser';

const words = parseWordList('kit-ten\npup-py');
const noop = () => {};

function Harness() {
  const schedule = useDeckSchedule('t', words.map(w => w.word));
  return <WordCardDeck words={words} schedule={schedule} onSpeak={noop} onSpeakSyllables={noop} onAttempts={noop} />;
}

const fill = async (user, letters) => {
  const boxes = screen.getAllByLabelText(/Letter \d of word/);
  for (let i = 0; i < boxes.length; i++) await user.type(boxes[i], letters[i]);
};

describe('WordCardDeck', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('shows one card, grades it, flips, and moves to the next word', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText('2 due today')).toBeInTheDocument();
    // kitten at level 1 hides letters 1,3,5 -> i, t, n
    await fill(user, ['i', 't', 'n']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Next time: 1 in 3 letters shown, tomorrow/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    expect(screen.getByText('1 due today')).toBeInTheDocument();
  });

  it('a miss drops/requeues instead of finishing the word', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await fill(user, ['x', 'x', 'x']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/back later this session/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
  });

  it('quiz mode: a correct spelling tests the word out', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // shuffle -> [puppy, kitten]
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Quiz' }));
    for (let n = 0; n < 2; n++) {
      const input = screen.getByLabelText('Type the word you heard');
      await user.type(input, n === 0 ? 'puppy' : 'kitten');
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: /Next word|See results/ }));
    }
    expect(screen.getByText('Tested out of 2 of 2 words')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('quiz mode: shows what was typed vs correct, and retries missed words', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // shuffle -> [puppy, kitten]
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Quiz' }));
    await user.type(screen.getByLabelText('Type the word you heard'), 'pupee');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('pupee')).toBeInTheDocument();
    expect(screen.getByLabelText('The word is puppy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next word' }));
    await user.type(screen.getByLabelText('Type the word you heard'), 'kitten');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'See results' }));
    await user.click(screen.getByRole('button', { name: 'Missed word (1)' }));
    expect(screen.getByText('Word 1 of 1')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('quiz mode: can quiz again on all words including learned', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Quiz' }));
    for (const w of ['puppy', 'kitten']) {
      await user.type(screen.getByLabelText('Type the word you heard'), w);
      await user.click(screen.getByRole('button', { name: 'Check' }));
      await user.click(screen.getByRole('button', { name: /Next word|See results/ }));
    }
    expect(screen.queryByRole('button', { name: /Not yet mastered/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'All words, including learned (2)' }));
    expect(screen.getByText('Word 1 of 2')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
