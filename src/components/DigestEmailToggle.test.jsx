// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// Plain functions (not vi.fn) so rejected promises are not tracked by the spy
const api = vi.hoisted(() => {
  const s = { impl: {}, calls: {} };
  s.wrap = (name, dflt) => (...a) => { (s.calls[name] ||= []).push(a); return (s.impl[name] || dflt)(...a); };
  return s;
});
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getDigestPrefs: api.wrap('getDigestPrefs', () => Promise.resolve({ email_opt_in: false })),
  setDigestEmail: api.wrap('setDigestEmail', (v) => Promise.resolve({ email_opt_in: v }))
}));

import DigestEmailToggle from './DigestEmailToggle';

beforeEach(() => { api.impl = {}; api.calls = {}; });
afterEach(cleanup);

describe('DigestEmailToggle', () => {
  it('starts off, and is disabled until the saved choice has loaded', async () => {
    render(<DigestEmailToggle />);
    const box = screen.getByRole('checkbox', { name: /email me this summary/i });
    expect(box).toBeDisabled();
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).not.toBeChecked();
  });

  it('reflects a saved opt-in', async () => {
    api.impl.getDigestPrefs = () => Promise.resolve({ email_opt_in: true });
    render(<DigestEmailToggle />);
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked());
  });

  it('saves the choice when toggled on and off', async () => {
    render(<DigestEmailToggle />);
    const box = await screen.findByRole('checkbox');
    await waitFor(() => expect(box).toBeEnabled());

    await userEvent.click(box);
    await waitFor(() => expect(box).toBeChecked());
    expect(api.calls.setDigestEmail).toEqual([[true]]);

    await userEvent.click(box);
    await waitFor(() => expect(box).not.toBeChecked());
    expect(api.calls.setDigestEmail[1]).toEqual([false]);
  });

  it('keeps the old choice and says so when saving fails', async () => {
    api.impl.setDigestEmail = () => Promise.reject(new Error('down'));
    render(<DigestEmailToggle />);
    const box = await screen.findByRole('checkbox');
    await waitFor(() => expect(box).toBeEnabled());

    await userEvent.click(box);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(box).not.toBeChecked();
  });

  it('falls back to off (never on) when the saved choice cannot be loaded', async () => {
    api.impl.getDigestPrefs = () => Promise.reject(new Error('offline'));
    render(<DigestEmailToggle />);
    const box = screen.getByRole('checkbox');
    await waitFor(() => expect(box).toBeEnabled());
    expect(box).not.toBeChecked();
  });
});
