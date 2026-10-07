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
import { toDateStr } from '../utils/schedule';

const GROUPS = ['ou', 'ow', 'oi', 'oy'];
const HINTS = ['ou says "ow" as in out'];
const noop = () => {};

function Harness({ raw = 'thou-sand', onAttempts = noop }) {
  const words = parseWordList(raw);
  const schedule = useDeckSchedule('smart', words.map(w => w.word));
  return (
    <WordCardDeck words={words} schedule={schedule} onSpeak={noop} onSpeakSyllables={noop}
      onAttempts={onAttempts} focusGroups={GROUPS} hints={HINTS} />
  );
}

const seedLevel = (word, level) => localStorage.setItem('spelling_tutor_deck_progress_v1:smart', JSON.stringify({
  testDate: null,
  words: { [word]: { level, mastered: false, due: toDateStr(new Date()), lastScore: null, advancedOn: null, attempts: 1 } }
}));

describe('Smart hiding in the deck', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('L1 shows the lesson groups as choices; a right pick advances', async () => {
    const user = userEvent.setup();
    const onAttempts = vi.fn();
    render(<Harness onAttempts={onAttempts} />);
    expect(screen.getByText(/Level 1 of 4 · Pick the focus letters/)).toBeInTheDocument();
    for (const g of GROUPS) expect(screen.getByRole('button', { name: g })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Letter \d of word/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ou' }));
    await user.click(screen.getByRole('button', { name: /Check your answer for thousand/ }));
    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/Next time: type the focus letters, tomorrow/)).toBeInTheDocument();
    // logged with typed = the chosen group's letters
    expect(onAttempts).toHaveBeenCalledWith('thousand', [
      { letter: 'o', position: 2, correct: 1, typed: 'o' },
      { letter: 'u', position: 3, correct: 1, typed: 'u' }
    ]);
    // Harvey ball in the strip now shows one quarter
    expect(screen.getByRole('listitem', { name: /thousand: Level 2 of 4/ })).toBeInTheDocument();
  });

  it('a wrong pick at L1 stays at L1 and shows the lesson hint', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'ow' }));
    await user.click(screen.getByRole('button', { name: /Check your answer for thousand/ }));
    expect(await screen.findByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/So close! Same level/)).toBeInTheDocument();
    expect(screen.getByText(/ou says "ow" as in out/)).toBeInTheDocument();
  });

  it('a typed miss at L2 drops the word back to L1 choices', async () => {
    seedLevel('thousand', 2);
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText(/Level 2 of 4 · Type the focus letters/)).toBeInTheDocument();
    const boxes = screen.getAllByLabelText(/Letter \d of word/);
    expect(boxes).toHaveLength(2);
    for (const b of boxes) await user.type(b, 'x');
    await user.click(screen.getByRole('button', { name: /Check your spelling for thousand/ }));
    expect(await screen.findByText(/Dropping back to pick the focus letters/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByRole('button', { name: 'ou' })).toBeInTheDocument();
  });

  it('words without the lesson pattern use regular hiding', () => {
    render(<Harness raw="kit-ten" />);
    expect(screen.getByText(/Level 1 of 4 · 1 in 2 letters shown/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Letter \d of word/)).toHaveLength(3);
  });
});
