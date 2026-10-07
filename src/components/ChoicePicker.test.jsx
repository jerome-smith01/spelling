// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ChoicePicker from './ChoicePicker';
import { parseWordList } from '../utils/wordParser';
import { findTargets } from '../utils/smartHide';

const GROUPS = ['ou', 'ow', 'oi', 'oy'];
const setup = (raw) => {
  const word = parseWordList(raw)[0];
  const onResult = vi.fn();
  const onAttempts = vi.fn();
  render(<ChoicePicker word={word} targets={findTargets(word.word, GROUPS)} groups={GROUPS}
    onSpeak={() => {}} onAttempts={onAttempts} onResult={onResult} />);
  return { onResult, onAttempts };
};

describe('ChoicePicker', () => {
  afterEach(cleanup);

  it('disables Check until every blank has a pick', async () => {
    const user = userEvent.setup();
    setup('cow-boy');
    const check = screen.getByRole('button', { name: /Check your answer/ });
    expect(check).toBeDisabled();
    expect(screen.getAllByRole('group')).toHaveLength(2);
    const [first, second] = screen.getAllByRole('group');
    await user.click(first.querySelector('button'));
    expect(check).toBeDisabled();
    await user.click(second.querySelectorAll('button')[3]);
    expect(check).toBeEnabled();
  });

  it('grades each group; a partly wrong answer scores the right letters', async () => {
    const user = userEvent.setup();
    const { onResult } = setup('cow-boy');
    const [first, second] = screen.getAllByRole('group');
    await user.click(first.querySelectorAll('button')[1]); // ow (right)
    await user.click(second.querySelectorAll('button')[2]); // oi (wrong, should be oy)
    await user.click(screen.getByRole('button', { name: /Check your answer/ }));
    expect(onResult).toHaveBeenCalledWith({
      pct: 50,
      results: { 1: 'correct', 2: 'correct', 4: 'incorrect', 5: 'incorrect' },
      typed: { 1: 'o', 2: 'w', 4: 'o', 5: 'i' }
    });
  });

  it('marks the chosen option as pressed and fills the blanks', async () => {
    const user = userEvent.setup();
    setup('thou-sand');
    await user.click(screen.getByRole('button', { name: 'oi' }));
    expect(screen.getByRole('button', { name: 'oi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'ou' })).toHaveAttribute('aria-pressed', 'false');
  });
});
