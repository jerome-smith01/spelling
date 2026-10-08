// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: false }) }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login' }));
vi.mock('../services/smartApi', () => ({ splitSyllables: vi.fn(), importPhoto: vi.fn() }));

import NewDeckFlow, { nameTaken } from './NewDeckFlow';

const setup = () => {
  const onCreate = vi.fn(() => ({ success: true }));
  const onCancel = vi.fn();
  render(<NewDeckFlow existingNames={['3rd Grade Words', 'Week 1']} onCreate={onCreate} onCancel={onCancel} />);
  return { onCreate, onCancel, user: userEvent.setup() };
};

describe('NewDeckFlow', () => {
  afterEach(cleanup);

  it('compares names ignoring case and spaces', () => {
    expect(nameTaken(' week 1 ', ['Week 1'])).toBe(true);
    expect(nameTaken('Week 2', ['Week 1'])).toBe(false);
  });

  it('rejects a name that is already used and creates nothing', async () => {
    const { onCreate, user } = setup();
    await user.type(screen.getByLabelText(/Name your new deck/), 'week 1');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/already have a deck/);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('after a unique name, offers photo or typing, and only creates on save', async () => {
    const { onCreate, user } = setup();
    await user.type(screen.getByLabelText(/Name your new deck/), 'Week 2');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/Upload homework photo/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Type the words instead/ }));
    await user.type(screen.getByLabelText(/Words, one per line/), 'kit-ten');
    await user.click(screen.getByRole('button', { name: 'Save & Practice' }));
    expect(onCreate).toHaveBeenCalledWith({ name: 'Week 2', wordsRaw: 'kit-ten' });
  });

  it('typing step keeps the bigger-list note, the Advanced AI prompt and a Generate syllables button', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name your new deck/), 'Week 3');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Type the words instead/ }));
    expect(screen.getByText(/Bigger list\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate syllables/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Advanced/ }));
    expect(screen.getByRole('button', { name: 'Copy AI Prompt' })).toBeInTheDocument();
  });
});
