// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

// Plain functions (not vi.fn) so rejected promises are not tracked by the spy
const api = vi.hoisted(() => {
  const s = { impl: {}, calls: {}, auth: { status: 'authenticated', isLoggedIn: true } };
  s.wrap = (name, dflt) => (...a) => { (s.calls[name] ||= []).push(a); return (s.impl[name] || dflt)(...a); };
  return s;
});

vi.mock('../hooks/useAuth', () => ({ useAuth: () => api.auth }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login?redirect=/here' }));
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getWordDetail: api.wrap('getWordDetail', () => Promise.reject(new Error('unset'))),
  analyzeWord: api.wrap('analyzeWord', () => Promise.reject(new Error('unset')))
}));

import WordDetailPage from './WordDetailPage';

const letters = (word, missesAt = {}) =>
  [...word].map((letter, position) => ({
    position, letter,
    attempts: 3,
    misses: missesAt[position] || 0,
    last_typed: missesAt[position] ? 'k' : '',
    patterns: []
  }));

const detail = (over = {}) => ({
  word: 'make', attempt_count: 12, error_count: 4, friction_score: 20, perfect_streak: 0,
  mastered_at: null, last_practiced: '2026-09-20 12:00:00', tip: null, letters: letters('make', { 3: 2 }), ...over
});

const renderPage = (word = 'make') =>
  render(
    <MemoryRouter initialEntries={[`/progress/words/${encodeURIComponent(word)}`]}>
      <Routes><Route path="/progress/words/:word" element={<WordDetailPage />} /></Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  api.impl = {};
  api.calls = {};
  api.auth = { status: 'authenticated', isLoggedIn: true };
});
afterEach(cleanup);

describe('WordDetailPage', () => {
  it('asks a signed-out visitor to log in without calling the API', () => {
    api.auth = { status: 'anonymous', isLoggedIn: false };
    renderPage();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?redirect=/here');
    expect(api.calls.getWordDetail).toBeUndefined();
  });

  it('shows the word, its stats and a result for every letter, in words and not only color', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail());
    renderPage();

    expect(await screen.findByRole('heading', { name: 'make' })).toBeInTheDocument();
    expect(api.calls.getWordDetail).toEqual([['make']]);
    expect(screen.getByText('67%')).toBeInTheDocument();   // 8 of 12 correct

    const list = screen.getByRole('list', { name: 'Results for each letter of make' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveTextContent('e');
    expect(items[3]).toHaveTextContent('2 misses');
    expect(items[0]).toHaveTextContent('always right');
  });

  it('says a single miss in the singular and untested letters as not tested', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail({
      letters: [{ position: 0, letter: 'm', attempts: 0, misses: 0, last_typed: '', patterns: [] },
                { position: 1, letter: 'a', attempts: 2, misses: 1, last_typed: 'o', patterns: [] }]
    }));
    renderPage();
    await screen.findByRole('heading', { name: 'make' });
    expect(screen.getByText('not tested')).toBeInTheDocument();
    expect(screen.getByText('1 miss')).toBeInTheDocument();
  });

  it('shows a cached tip', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail({
      friction_score: 90, tip: { tip: 'Silent e sleeps.', mnemonic: 'Shh, the e.', breakdown: 'm + ake' }
    }));
    renderPage();
    expect(await screen.findByText(/Silent e sleeps/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get a tip/i })).not.toBeInTheDocument();
  });

  it('offers a tip for a struggling word with none yet, and opens the tip dialog', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail({ friction_score: 90 }));
    api.impl.analyzeWord = () => Promise.resolve({ tip: 'Fresh tip.', mnemonic: 'Fresh mnemonic.', breakdown: 'm + ake' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: /get a tip for this word/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText(/Fresh tip/)).toBeInTheDocument();
    expect(api.calls.analyzeWord).toEqual([['make']]);
  });

  it('does not offer a tip for a word that is not tricky', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail({ friction_score: 10 }));
    renderPage();
    await screen.findByRole('heading', { name: 'make' });
    expect(screen.queryByRole('button', { name: /get a tip/i })).not.toBeInTheDocument();
  });

  it('handles a word with no history', async () => {
    api.impl.getWordDetail = () => Promise.reject(Object.assign(new Error('nf'), { name: 'ApiError', status: 404 }));
    renderPage('zebra');
    expect(await screen.findByText(/no practice history for this word/i)).toBeInTheDocument();
  });

  it('shows errors and expired sessions clearly', async () => {
    api.impl.getWordDetail = () => Promise.reject(Object.assign(new Error('x'), { name: 'AuthError' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);
    cleanup();

    api.impl.getWordDetail = () => Promise.reject(new Error('Server exploded'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Server exploded');
  });

  it('decodes the word from the URL, including apostrophes', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail({ word: "don't" }));
    renderPage("don't");
    await screen.findByRole('heading', { name: "don't" });
    expect(api.calls.getWordDetail).toEqual([["don't"]]);
  });

  it('links back to the Progress page', async () => {
    api.impl.getWordDetail = () => Promise.resolve(detail());
    renderPage();
    expect(await screen.findByRole('link', { name: /back to progress/i })).toHaveAttribute('href', '/progress');
  });
});
