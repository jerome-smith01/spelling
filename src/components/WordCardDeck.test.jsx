// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false }) }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login' }));

import WordCardDeck from './WordCardDeck';
import { useDeckSchedule } from '../hooks/useDeckSchedule';
import { parseWordList } from '../utils/wordParser';

// These tests move through results instantly; the review gate (which treats that as rushing) is off unless a test turns it on
const mockGate = vi.hoisted(() => ({ rushed: false }));
vi.mock('../utils/reviewPolicy', async (importOriginal) => ({ ...(await importOriginal()), isRushed: () => mockGate.rushed }));

const words = parseWordList('kit-ten\npup-py');
const noop = () => {};

function Harness({ keyboardHidden = false }) {
  const schedule = useDeckSchedule('t', words.map(w => w.word));
  return <WordCardDeck words={words} schedule={schedule} onSpeak={noop} onSpeakSyllables={noop} onAttempts={noop} keyboardHidden={keyboardHidden} />;
}

const fill = async (user, letters) => {
  const boxes = screen.getAllByLabelText(/Letter \d of word/);
  for (let i = 0; i < boxes.length; i++) await user.type(boxes[i], letters[i]);
};

describe('WordCardDeck', () => {
  // New words start at level 2 here (1 in 2 letters visible, typed); level 1 is the pick-the-letters exercise
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('spelling_tutor_deck_prefs_v1', JSON.stringify({ startLevel: 2, levelScheme: 2 }));
  });
  afterEach(cleanup);

  const dots = () => within(screen.getByRole('list', { name: 'Session cards' })).getAllByRole('listitem');

  it('shows one card, grades it, flips, and moves to the next word', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // shuffle keeps [kitten, puppy]
    const user = userEvent.setup();
    render(<Harness />);
    expect(dots()).toHaveLength(2);
    // kitten at level 1 hides letters 1,3,5 -> i, t, n
    await fill(user, ['i', 't', 'n']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    expect(screen.queryByText('Grade')).not.toBeInTheDocument();
    expect(screen.queryByText(/Stage 1 to 2/)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Last 1 attempts/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    expect(dots()[0]).toHaveAccessibleName(/Card 1 of 2: scored 100%/);
    expect(dots()[1]).toHaveAttribute('aria-current', 'step');
    vi.restoreAllMocks();
  });

  it('a miss shows an X dot and the card is retried in place after the loop', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    render(<Harness />);
    await fill(user, ['x', 'x', 'x']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    expect(dots()[0]).toHaveAccessibleName(/missed/);
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Skip this card for now' }));
    expect(dots()[1]).toHaveAccessibleName(/skipped/);
    // loops back to the first card that isn't 100% yet
    expect(screen.getByLabelText('Spelling card for kitten')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('practice: leaving a missed card too fast opens the review popup', async () => {
    mockGate.rushed = true;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    render(<Harness />);
    await fill(user, ['x', 'x', 'x']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByRole('alertdialog', { name: 'Take time to review your work.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Spelling card for kitten')).toBeInTheDocument(); // still on the card
    mockGate.rushed = false;
    vi.restoreAllMocks();
  });

  it('practice: a card result and the session summary use the quiz result format', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    render(<Harness />);
    await fill(user, ['x', 'x', 'x']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    expect(await screen.findByText('Your spelling')).toBeInTheDocument();
    expect(screen.getByText('Correct spelling')).toBeInTheDocument();
    expect(screen.getByLabelText('The word is kitten')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End session' }));
    // the session summary: grade, a review of every word, and what to focus on
    expect(screen.getByRole('status', { name: /Session grade/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Every word, with your spelling')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Not tested out' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retake missed word (1)' }));
    expect(screen.getByLabelText('Spelling card for kitten')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('Back, clicking a dot, and End session move around the session', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Back to the previous card' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Skip this card for now' }));
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to the previous card' }));
    expect(screen.getByLabelText('Spelling card for kitten')).toBeInTheDocument();
    await user.click(dots()[1]);
    expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'End session' }));
    expect(screen.getByText('All done for today!')).toBeInTheDocument();
    vi.restoreAllMocks();
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
    expect(screen.getByLabelText('You spelled pupee')).toBeInTheDocument();
    expect(screen.getByLabelText('The word is puppy')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next word' }));
    await user.type(screen.getByLabelText('Type the word you heard'), 'kitten');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    await user.click(screen.getByRole('button', { name: 'See results' }));
    await user.click(screen.getByRole('button', { name: 'Retake missed word (1)' }));
    expect(screen.getByLabelText('Word 1 of 1: current')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Retake all words (2)' }));
    expect(screen.getByLabelText('Word 1 of 2: current')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('on touch devices spelling uses the on-screen keyboard, not the device keyboard', async () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // shuffle keeps [kitten, puppy]
    try {
      const user = userEvent.setup();
      render(<Harness />);
      const kb = screen.getByRole('group', { name: 'Keyboard' });
      const boxes = screen.getAllByLabelText(/Letter \d of word/);
      boxes.forEach(b => { expect(b).toHaveAttribute('readonly'); expect(b).toHaveAttribute('inputmode', 'none'); });
      expect(within(kb).getByRole('button', { name: 'Check' })).toBeDisabled();
      // kitten at level 1 hides i, t, n; backspace fixes a slip
      for (const c of ['i', 'x']) await user.click(within(kb).getByRole('button', { name: c }));
      await user.click(within(kb).getByRole('button', { name: 'Delete' }));
      for (const c of ['t', 'n']) await user.click(within(kb).getByRole('button', { name: c }));
      await user.click(within(kb).getByRole('button', { name: 'Check' }));
      expect(await screen.findByText('Progress History')).toBeInTheDocument();
      // the same keyboard stays put; its right-hand key now moves to the next card
      await user.click(within(screen.getByRole('group', { name: 'Keyboard' })).getByRole('button', { name: 'Next card' }));
      expect(screen.getByLabelText('Spelling card for puppy')).toBeInTheDocument();
    } finally {
      vi.restoreAllMocks();
      window.matchMedia = original;
    }
  });

  it('hides the on-screen keyboard while keyboardHidden is set (settings open)', () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      const { rerender } = render(<Harness />);
      expect(screen.getByRole('group', { name: 'Keyboard' })).toBeInTheDocument();
      rerender(<Harness keyboardHidden />);
      expect(screen.queryByRole('group', { name: 'Keyboard' })).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it('right on the first try is a green check; right only on a later try is a gray check', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // [kitten, puppy]
    localStorage.setItem('spelling_tutor_deck_prefs_v1', JSON.stringify({ startLevel: 2, levelScheme: 2, dropPct: 0 }));
    const user = userEvent.setup();
    render(<Harness />);
    const check = () => user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    await fill(user, ['x', 'x', 'x']);               // kitten: wrong first
    await check();
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    await user.click(screen.getByRole('button', { name: 'Skip this card for now' }));
    await fill(user, ['i', 't', 'n']);               // kitten again: right on the second try
    await check();
    expect(dots()[0]).toHaveAccessibleName(/right on a later try/);
    expect(dots()[0]).toHaveClass('retry');
    expect(dots()[0]).not.toHaveClass('ok');
    vi.restoreAllMocks();
  });

  it('a letter missed twice gets a focus retry, then one normal try, then a gray check dot', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // [kitten, puppy]
    // never drop a level on a miss, so all four tries stay at level 2 (typed letters)
    localStorage.setItem('spelling_tutor_deck_prefs_v1', JSON.stringify({ startLevel: 2, levelScheme: 2, dropPct: 0 }));
    const user = userEvent.setup();
    render(<Harness />);
    const check = () => user.click(screen.getByRole('button', { name: /Check your spelling for kitten/ }));
    const next = () => user.click(screen.getByRole('button', { name: 'Next card' }));
    const skipPuppy = () => user.click(screen.getByRole('button', { name: 'Skip this card for now' }));

    // kitten hides i, t, n; the 'i' is missed on two tries
    await fill(user, ['x', 'x', 'x']);
    await check();
    await next(); await skipPuppy();
    await fill(user, ['x', 't', 'n']);
    await check();
    expect(await screen.findByText('Next time, just the tricky letter.')).toBeInTheDocument();
    await next(); await skipPuppy();

    // focus try: only the 'i' is hidden
    expect(screen.getByRole('status')).toHaveTextContent('Focus on the tricky letter');
    expect(screen.getAllByLabelText(/Letter \d of word/)).toHaveLength(1);
    await fill(user, ['i']);
    await check();
    expect(await screen.findByText('Nice! Now try the whole word again.')).toBeInTheDocument();
    expect(dots()[0]).toHaveAccessibleName(/missed/);
    await next(); await skipPuppy();

    // confirm try: back to the normal level's hiding (level unchanged by the focus try)
    expect(screen.getAllByLabelText(/Letter \d of word/)).toHaveLength(3);
    await fill(user, ['i', 't', 'n']);
    await check();
    expect(dots()[0]).toHaveAccessibleName(/finished with a focus retry/);
    expect(dots()[0]).toHaveClass('assisted');
    vi.restoreAllMocks();
  });
});
