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

const noop = () => {};
const words = parseWordList('kit-ten');

function Harness({ onAttempts = noop, onSpeak = noop, onSpeakBoth }) {
  const schedule = useDeckSchedule('audio', words.map(w => w.word));
  return (
    <WordCardDeck words={words} schedule={schedule} onSpeak={onSpeak} onSpeakSyllables={noop}
      onSpeakBoth={onSpeakBoth} onAttempts={onAttempts} />
  );
}

const seedLevel = (level) => localStorage.setItem('spelling_tutor_deck_progress_v1:audio', JSON.stringify({
  testDate: null,
  levelScheme: 2,
  words: { kitten: { level, mastered: false, due: toDateStr(new Date()), lastScore: null, advancedOn: null, attempts: 1 } }
}));

describe('Level 5: quiz from audio', () => {
  beforeEach(() => { localStorage.clear(); seedLevel(5); });
  afterEach(cleanup);

  it('shows only the audio buttons and an input, never the word or its letters', () => {
    render(<Harness onSpeakBoth={noop} />);
    expect(screen.getByRole('button', { name: 'Hear the word at normal speed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear the word syllable by syllable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /normal speed, then slowly/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Type the word you heard')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Letter \d of word/)).not.toBeInTheDocument();
    expect(screen.queryByText('kitten')).not.toBeInTheDocument();
  });

  it('Check waits for something to be typed, then grades the whole word', async () => {
    const user = userEvent.setup();
    const onAttempts = vi.fn();
    render(<Harness onAttempts={onAttempts} />);
    const check = screen.getByRole('button', { name: 'Check your spelling' });
    expect(check).toBeDisabled();
    await user.type(screen.getByLabelText('Type the word you heard'), 'kitten');
    expect(check).toBeEnabled();
    await user.click(check);
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    expect(onAttempts).toHaveBeenCalledTimes(1);
    const [wordArg, attempts] = onAttempts.mock.calls[0];
    expect(wordArg).toBe('kitten');
    expect(attempts).toHaveLength(6);
    expect(attempts.every(a => a.correct === 1)).toBe(true);
    // 100% at the last level: the word is learned
    expect(screen.getByRole('listitem', { name: /scored 100%/ })).toBeInTheDocument();
  });

  it('a misspelling records the missed letters and does not pass the word', async () => {
    const user = userEvent.setup();
    const onAttempts = vi.fn();
    render(<Harness onAttempts={onAttempts} />);
    await user.type(screen.getByLabelText('Type the word you heard'), 'kiten');
    await user.click(screen.getByRole('button', { name: 'Check your spelling' }));
    expect(await screen.findByText('Progress History')).toBeInTheDocument();
    const attempts = onAttempts.mock.calls[0][1];
    expect(attempts.some(a => a.correct === 0)).toBe(true);
    expect(screen.getByRole('listitem', { name: /missed/ })).toBeInTheDocument();
  });

  it('plays the word when the audio button is pressed', async () => {
    const user = userEvent.setup();
    const onSpeak = vi.fn();
    render(<Harness onSpeak={onSpeak} />);
    onSpeak.mockClear();
    await user.click(screen.getByRole('button', { name: 'Hear the word at normal speed' }));
    expect(onSpeak).toHaveBeenCalledWith(expect.anything(), 'kitten');
  });
});
