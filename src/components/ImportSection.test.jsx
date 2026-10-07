// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const auth = { isLoggedIn: false };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login' }));
const splitSyllables = vi.fn();
vi.mock('../services/smartApi', () => ({ splitSyllables: (...a) => splitSyllables(...a), importPhoto: vi.fn() }));

import ImportSection from './ImportSection';

const renderIt = (props = {}) => {
  const onImport = vi.fn(() => ({ success: true }));
  render(<ImportSection isExpanded onClose={() => {}} currentRaw="" onImport={onImport} onResetDefault={() => {}} {...props} />);
  return { onImport };
};

describe('ImportSection', () => {
  beforeEach(() => { auth.isLoggedIn = false; splitSyllables.mockReset(); });
  afterEach(cleanup);

  it('saves focus letters with the words', async () => {
    const user = userEvent.setup();
    const { onImport } = renderIt();
    await user.type(screen.getByLabelText(/^Words/), 'boy');
    await user.type(screen.getByLabelText(/Focus letters/), 'OU, ow; oi');
    await user.click(screen.getByRole('button', { name: 'Save & Practice' }));
    expect(onImport).toHaveBeenCalledWith('boy', { focusGroups: ['ou', 'ow', 'oi'] });
  });

  it('logged out: suggests hyphens or logging in, and saves as typed', async () => {
    const user = userEvent.setup();
    const { onImport } = renderIt();
    await user.type(screen.getByLabelText(/^Words/), 'fountain');
    expect(screen.getByText(/Add hyphens to show syllables/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save & Practice' }));
    expect(onImport).toHaveBeenCalledWith('fountain', { focusGroups: [] });
    expect(splitSyllables).not.toHaveBeenCalled();
  });

  it('logged in: splits from the dictionary, then AI for unknown words, and asks to check first', async () => {
    auth.isLoggedIn = true;
    splitSyllables.mockResolvedValue({ splits: { flabbergast: 'flab-ber-gast' } });
    const user = userEvent.setup();
    const { onImport } = renderIt();
    const box = screen.getByLabelText(/^Words/);
    await user.type(box, 'fountain{enter}flabbergast{enter}boy');
    await user.click(screen.getByRole('button', { name: 'Save & Practice' }));
    expect(await screen.findByText(/We split 2 words into syllables/)).toBeInTheDocument();
    expect(box).toHaveValue('foun-tain\nflab-ber-gast\nboy');
    expect(splitSyllables).toHaveBeenCalledWith(['flabbergast']);
    expect(onImport).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save & Practice' }));
    expect(onImport).toHaveBeenCalledWith('foun-tain\nflab-ber-gast\nboy', { focusGroups: [] });
  });

  it('keeps the AI prompt generator behind Advanced', async () => {
    const user = userEvent.setup();
    renderIt();
    expect(screen.queryByRole('button', { name: 'Copy AI Prompt' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Advanced/ }));
    expect(screen.getByRole('button', { name: 'Copy AI Prompt' })).toBeInTheDocument();
  });
});
