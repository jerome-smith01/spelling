// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

// No network in tests: behave as a signed-out visitor
vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: vi.fn().mockResolvedValue(null)
}));

import App from './App';

beforeEach(() => {
  localStorage.clear();
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
});
afterEach(cleanup);

// Guards against the provider/router wiring errors ("useLists must be used inside
// <ListsProvider>", "useLocation() may be used only in the context of a <Router>")
describe('App wiring', () => {
  it('renders the default list at /lists/default inside all providers', async () => {
    render(
      <MemoryRouter initialEntries={['/lists/default']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('navigation', { name: 'Main Navigation' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Spelling Practice Controls')).toBeInTheDocument();
  });

  it('shows the deck dashboard at / with practice and quiz entry points', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'My decks' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Practice / })).toHaveAttribute('href', '/lists/default');
    expect(screen.getByRole('link', { name: /^Quiz / })).toHaveAttribute('href', '/lists/default?mode=quiz');
    expect(screen.queryByLabelText('Spelling Practice Controls')).not.toBeInTheDocument();
  });

  it('opens the quiz straight from the dashboard link', async () => {
    render(
      <MemoryRouter initialEntries={['/lists/default?mode=quiz']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByLabelText('Exit quiz')).toBeInTheDocument();
  });

  it('shows a not-found page for an unknown route', async () => {
    render(
      <MemoryRouter initialEntries={['/nope']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('navigation', { name: 'Main Navigation' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Spelling Practice Controls')).not.toBeInTheDocument();
  });
});
