// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

// Plain functions (not vi.fn) so rejected promises are not tracked by the spy
const api = vi.hoisted(() => {
  const s = { impl: {}, calls: {}, auth: { status: 'authenticated' }, pending: 0 };
  s.wrap = (name, dflt) => (...a) => { (s.calls[name] ||= []).push(a); return (s.impl[name] || dflt)(...a); };
  return s;
});

vi.mock('../hooks/useAuth', () => ({ useAuth: () => api.auth }));
vi.mock('../hooks/useLists', () => ({
  useLists: () => ({
    lists: [{ id: 'l1', name: 'Week 1', wordsRaw: 'cat\nboat' }],
    defaultList: { id: 'default', name: '3rd-Grade Default', wordsRaw: 'con-trol\nloving' },
    syncNow: () => {}
  })
}));
vi.mock('../services/attemptQueue', () => ({
  flush: async () => 0,
  queueLength: () => api.pending,
  subscribe: () => () => {}
}));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login?redirect=/progress' }));
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getScores: api.wrap('getScores', () => Promise.resolve([])),
  getPatterns: api.wrap('getPatterns', () => Promise.resolve([])),
  getLatestDigest: api.wrap('getLatestDigest', () => Promise.resolve(null)),
  getDigestPrefs: api.wrap('getDigestPrefs', () => Promise.resolve({ email_opt_in: false })),
  setDigestEmail: api.wrap('setDigestEmail', (v) => Promise.resolve({ email_opt_in: v })),
  analyzePattern: api.wrap('analyzePattern', () => Promise.reject(new Error('not expected')))
}));

import ProgressPage from './ProgressPage';

const SCORES = [
  { word: 'loving', attempt_count: 20, error_count: 15, friction_score: 90, perfect_streak: 0, mastered_at: null, last_practiced: '2026-09-20 12:00:00' },
  { word: 'cat', attempt_count: 9, error_count: 0, friction_score: 0, perfect_streak: 3, mastered_at: '2026-09-19 10:00:00', last_practiced: '2026-09-19 10:00:00' },
  { word: 'boat', attempt_count: 10, error_count: 2, friction_score: 20, perfect_streak: 0, mastered_at: null, last_practiced: '2026-09-18 10:00:00' }
];
const REPORT = {
  summary: 'Your child often forgets the silent e.',
  why_it_happens: 'The letter makes no sound.',
  practice_ideas: ['Write make.', 'Circle the e.', 'Spell aloud.'],
  example_words: ['cake', 'time']
};
const PATTERNS = [
  { pattern: 'silent_letters', label: 'Silent letters', status: 'active', misses: 8, distinct_words: 4, examples: [], report: REPORT }
];
const DIGEST = {
  periodStart: '2026-09-20', periodEnd: '2026-09-27', summary: 'A great week of practice!',
  wordsPracticed: 3, sessions: 2, accuracyPercent: 80, masteredWords: ['cat']
};

const renderPage = (entry = '/progress') =>
  render(<MemoryRouter initialEntries={[entry]}><ProgressPage /></MemoryRouter>);

beforeEach(() => {
  api.impl = {};
  api.calls = {};
  api.auth = { status: 'authenticated' };
  api.pending = 0;
});
afterEach(cleanup);

describe('ProgressPage', () => {
  it('asks a signed-out visitor to log in, mentions waiting answers, and calls no API', () => {
    api.auth = { status: 'anonymous' };
    api.pending = 4;
    renderPage();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?redirect=/progress');
    expect(screen.getByText(/4 answers from this device are waiting/)).toBeInTheDocument();
    expect(api.calls.getScores).toBeUndefined();
  });

  it('shows the digest, buckets, patterns and the all-words table for a logged-in parent', async () => {
    api.impl.getScores = () => Promise.resolve(SCORES);
    api.impl.getPatterns = () => Promise.resolve(PATTERNS);
    api.impl.getLatestDigest = () => Promise.resolve(DIGEST);
    renderPage();

    expect(await screen.findByText('A great week of practice!')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Learned \(1\)/ })).getByText('cat')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Struggling \(1\)/ })).getByText('loving')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Needs practice \(1\)/ })).getByText('boat')).toBeInTheDocument();
    expect(screen.getByText('Silent letters')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByText('Words practiced')).toHaveLength(2);   // digest card and the stat tile
    expect(screen.getByRole('checkbox', { name: /email me this summary/i })).toBeInTheDocument();
  });

  it('opens the parent report for an active pattern', async () => {
    api.impl.getScores = () => Promise.resolve(SCORES);
    api.impl.getPatterns = () => Promise.resolve(PATTERNS);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Read report' }));
    const dialog = await screen.findByRole('dialog', { name: 'Silent letters' });
    expect(within(dialog).getByText(REPORT.summary)).toBeInTheDocument();
    expect(api.calls.analyzePattern).toBeUndefined();   // the report was already cached

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('still shows word progress when the patterns and digest requests fail', async () => {
    api.impl.getScores = () => Promise.resolve(SCORES);
    api.impl.getPatterns = () => Promise.reject(new Error('patterns down'));
    api.impl.getLatestDigest = () => Promise.reject(new Error('digest down'));
    renderPage();

    expect(await screen.findByRole('region', { name: /Struggling \(1\)/ })).toBeInTheDocument();
    expect(screen.getByText(/No patterns to work on yet/)).toBeInTheDocument();
    expect(screen.getByText(/first weekly summary/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains an expired session and can retry', async () => {
    api.impl.getScores = () => Promise.reject(Object.assign(new Error('x'), { name: 'AuthError' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/session expired/i);

    api.impl.getScores = () => Promise.resolve(SCORES);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: /Struggling \(1\)/ })).toBeInTheDocument();
    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
  });

  it('explains being offline', async () => {
    api.impl.getScores = () => Promise.reject(Object.assign(new Error('x'), { name: 'NetworkError' }));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
  });

  it('filters the words by list', async () => {
    api.impl.getScores = () => Promise.resolve(SCORES);
    renderPage('/progress?list=l1');
    const mastered = await screen.findByRole('region', { name: /Learned \(1\)/ });
    expect(within(mastered).getByText('cat')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Struggling \(0\)/ })).toBeInTheDocument();   // loving is not in Week 1
    expect(screen.getByRole('region', { name: /Needs practice \(1\)/ })).toBeInTheDocument(); // boat is
  });

  it('shows a friendly empty state before any practice', async () => {
    api.impl.getScores = () => Promise.resolve([]);
    renderPage();
    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('links every word to its detail page', async () => {
    api.impl.getScores = () => Promise.resolve(SCORES);
    renderPage();
    await screen.findByRole('table');
    const link = within(screen.getByRole('table')).getByRole('link', { name: 'loving' });
    expect(link).toHaveAttribute('href', '/progress/words/loving');
  });
});
