// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

vi.mock('./../services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: vi.fn().mockResolvedValue(null)
}));

import App from '../App';

const renderDash = () => render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});
afterEach(cleanup);

describe('Dashboard deck delete', () => {
  it('deletes the default deck after confirming, with no way to restore it', async () => {
    const user = userEvent.setup();
    renderDash();
    await user.click(await screen.findByRole('button', { name: 'Delete 3rd-Grade Default' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByLabelText('Deck 3rd-Grade Default')).toBeNull();
    expect(screen.queryByRole('button', { name: /Restore/ })).toBeNull();
  });

  it('stays deleted after a reload', async () => {
    localStorage.setItem('spelling_tutor_default_hidden_v1', '1');
    renderDash();
    await screen.findByRole('heading', { name: 'My decks' });
    expect(screen.queryByLabelText('Deck 3rd-Grade Default')).toBeNull();
  });

  const seedDeck = () => localStorage.setItem('spelling_tutor_lists_v5', JSON.stringify([{
    id: '11111111-1111-4111-8111-111111111111', name: 'Week 3', wordsRaw: 'kit-ten', isDefault: 0,
    updatedAt: '2026-01-01T00:00:00.000Z', dirty: true, deleted: false
  }]));

  it('asks first; Cancel keeps the deck, Delete removes it', async () => {
    const user = userEvent.setup();
    seedDeck();
    renderDash();
    await user.click(await screen.findByRole('button', { name: 'Delete Week 3' }));
    expect(screen.getByRole('dialog', { name: 'Delete deck?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Deck Week 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Week 3' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByLabelText('Deck Week 3')).toBeNull();
  });
});
