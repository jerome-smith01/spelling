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
  levelScheme: 2,
  words: { [word]: { level, mastered: false, due: toDateStr(new Date()), lastScore: null, advancedOn: null, attempts: 1 } }
}));

describe('Smart hiding in the deck', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('L1 shows the lesson groups as choices; a right pick advances', async () => {
    const user = userEvent.setup();
    const onAttempts = vi.fn();
    render(<Harness onAttempts={onAttempts} />);
    for (const g of GROUPS) expect(screen.getByRole('button', { name: g })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Letter \d of word/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ou' }));
    await user.click(screen.getByRole('button', { name: /Check your answer for thousand/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    // logged with typed = the chosen group's letters
    expect(onAttempts).toHaveBeenCalledWith('thousand', [
      { letter: 'o', position: 2, correct: 1, typed: 'o' },
      { letter: 'u', position: 3, correct: 1, typed: 'u' }
    ]);
    // the session dot for this card is now a check
    expect(screen.getByRole('listitem', { name: /Card 1 of 1: scored 100%/ })).toBeInTheDocument();
  });

  it('a wrong pick at L1 stays at L1 and shows the lesson hint', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'ow' }));
    await user.click(screen.getByRole('button', { name: /Check your answer for thousand/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    expect(screen.getByText(/ou says "ow" as in out/)).toBeInTheDocument();
  });

  it('a typed miss at L2 drops the word back to L1 choices', async () => {
    seedLevel('thousand', 2);
    const user = userEvent.setup();
    render(<Harness />);
    const boxes = screen.getAllByLabelText(/Letter \d of word/);
    expect(boxes).toHaveLength(2);
    for (const b of boxes) await user.type(b, 'x');
    await user.click(screen.getByRole('button', { name: /Check your spelling for thousand/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByRole('button', { name: 'ou' })).toBeInTheDocument();
  });

  it('words without the lesson pattern are still picked from choices at level 1, with their own wrong letters', async () => {
    const user = userEvent.setup();
    const onAttempts = vi.fn();
    render(<Harness raw="kit-ten" onAttempts={onAttempts} />);
    expect(screen.queryByLabelText(/Letter \d of word/)).not.toBeInTheDocument();
    const rows = screen.getAllByRole('group', { name: /Choose the letters for blank/ });
    expect(rows).toHaveLength(2); // kitten has 6 letters: two blanks
    for (const row of rows) expect(row.querySelectorAll('button')).toHaveLength(4);
    // pick the right letter in each blank (the blanks are 'i' and 'e' for this word)
    for (const row of rows) {
      const buttons = [...row.querySelectorAll('button')].map(b => b.textContent);
      const answer = buttons.find(l => 'kitten'.includes(l) && (l === 'i' || l === 'e'));
      await user.click(row.querySelector(`button[aria-pressed="false"]:nth-child(${buttons.indexOf(answer) + 1})`));
    }
    await user.click(screen.getByRole('button', { name: /Check your answer for kitten/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    expect(onAttempts).toHaveBeenCalled();
  });

  it('words without the lesson pattern use regular hiding from level 2', () => {
    seedLevel('kitten', 2);
    render(<Harness raw="kit-ten" />);
    expect(screen.getAllByLabelText(/Letter \d of word/)).toHaveLength(3);
  });
});
