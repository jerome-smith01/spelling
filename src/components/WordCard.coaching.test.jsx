// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// Plain functions (not vi.fn) so rejected promises are not tracked by the spy
const api = vi.hoisted(() => {
  const s = { impl: {}, calls: {}, auth: { isLoggedIn: true } };
  s.wrap = (name, dflt) => (...a) => { (s.calls[name] ||= []).push(a); return (s.impl[name] || dflt)(...a); };
  return s;
});
vi.mock('../hooks/useAuth', () => ({ useAuth: () => api.auth }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login?redirect=/here' }));
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  analyzeWord: api.wrap('analyzeWord', () => Promise.reject(new Error('unset')))
}));

import WordCard from './WordCard';
import { parseWordList } from '../utils/wordParser';

const word = parseWordList('con-trol')[0];
const noop = () => {};
const renderCard = (props = {}) =>
  render(
    <WordCard
      word={word}
      hiddenIndices={new Set()}
      onHide={noop}
      onShow={noop}
      onSpeak={noop}
      onSpeakSyllables={noop}
      onAttempts={noop}
      {...props}
    />
  );

beforeEach(() => {
  api.impl = {};
  api.calls = {};
  api.auth = { isLoggedIn: true };
});
afterEach(cleanup);

describe('WordCard coaching', () => {
  it('shows no flame for an easy word', () => {
    renderCard({ friction: 10 });
    expect(screen.queryByRole('button', { name: /tricky word/i })).not.toBeInTheDocument();
  });

  it('opens the tip dialog from the flame for a logged-in child', async () => {
    api.impl.analyzeWord = () => Promise.resolve({ tip: 'Tip!', mnemonic: 'Mnemonic!', breakdown: 'con + trol' });
    renderCard({ friction: 90 });

    await userEvent.click(screen.getByRole('button', { name: /tricky word: control/i }));
    expect(await screen.findByRole('dialog', { name: /a tip for "control"/i })).toBeInTheDocument();
    expect(await screen.findByText(/Tip!/)).toBeInTheDocument();
    expect(api.calls.analyzeWord).toEqual([['control']]);
  });

  it('closes the tip dialog and returns focus to the flame', async () => {
    api.impl.analyzeWord = () => Promise.resolve({ tip: 'T', mnemonic: 'M', breakdown: 'B' });
    renderCard({ friction: 90 });
    const flame = screen.getByRole('button', { name: /tricky word/i });

    await userEvent.click(flame);
    await screen.findByText(/Try this/);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(flame).toHaveFocus();
  });

  it('asks a signed-out child to log in and never calls the API', async () => {
    api.auth = { isLoggedIn: false };
    renderCard({ friction: 90 });
    await userEvent.click(screen.getByRole('button', { name: /tricky word/i }));
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(api.calls.analyzeWord).toBeUndefined();
  });

  it('reports what the child actually typed with each Check', async () => {
    const onAttempts = vi.fn();
    renderCard({ hiddenIndices: new Set([0, 1]), onAttempts });

    const boxes = screen.getAllByRole('textbox');
    await userEvent.type(boxes[0], 'x');   // wrong for "c"
    await userEvent.type(boxes[1], 'o');   // right for "o"
    await userEvent.click(screen.getByRole('button', { name: /check your spelling/i }));

    expect(onAttempts).toHaveBeenCalledTimes(1);
    const [w, attempts] = onAttempts.mock.calls[0];
    expect(w).toBe('control');
    expect(attempts).toEqual([
      { letter: 'c', position: 0, correct: 0, typed: 'x' },
      { letter: 'o', position: 1, correct: 1, typed: 'o' }
    ]);
  });

  it('reports a blank box as an empty typed value', async () => {
    const onAttempts = vi.fn();
    renderCard({ hiddenIndices: new Set([0]), onAttempts });
    await userEvent.click(screen.getByRole('button', { name: /check your spelling/i }));
    expect(onAttempts.mock.calls[0][1]).toEqual([{ letter: 'c', position: 0, correct: 0, typed: '' }]);
  });
});
