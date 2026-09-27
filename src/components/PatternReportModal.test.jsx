// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// A plain function (not vi.fn) so a rejected promise is never tracked/re-thrown by the spy
const api = vi.hoisted(() => ({ impl: () => Promise.resolve(null), calls: [] }));
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  analyzePattern: (...args) => { api.calls.push(args); return api.impl(...args); }
}));

const analyzePattern = {
  mockReset() { api.impl = () => Promise.resolve(null); api.calls.length = 0; },
  mockResolvedValue(v) { api.impl = () => Promise.resolve(v); },
  mockImplementation(fn) { api.impl = fn; },
  mockRejectedValue(e) { api.impl = () => Promise.reject(e); },
  get mock() { return { calls: api.calls }; }
};
import PatternReportModal from './PatternReportModal';

const REPORT = {
  summary: 'Your child often forgets the silent e.',
  why_it_happens: 'The letter makes no sound.',
  practice_ideas: ['Write make.', 'Circle the e.', 'Spell aloud.'],
  example_words: ['cake', 'time', 'rose']
};
const EXAMPLES = [{ word: 'make', position: 3, expected: 'e', typed: 'k' }, { word: 'bike', position: 3, expected: 'e', typed: '' }];

beforeEach(() => analyzePattern.mockReset());
afterEach(cleanup);

describe('PatternReportModal', () => {
  it('shows a cached report immediately without calling the API', () => {
    render(<PatternReportModal pattern={{ pattern: 'silent_letters', label: 'Silent letters', report: REPORT, examples: EXAMPLES }} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Silent letters' })).toBeInTheDocument();
    expect(screen.getByText(REPORT.summary)).toBeInTheDocument();
    expect(screen.getByText('Circle the e.')).toBeInTheDocument();
    expect(screen.getByText('cake, time, rose')).toBeInTheDocument();
    expect(api.calls).toHaveLength(0);
  });

  it('lists recent misses, describing blanks in plain words', () => {
    render(<PatternReportModal pattern={{ pattern: 'silent_letters', label: 'Silent letters', report: REPORT, examples: EXAMPLES }} onClose={() => {}} />);
    expect(screen.getByText(/wrote "k" where "e" belongs/)).toBeInTheDocument();
    expect(screen.getByText(/wrote nothing where "e" belongs/)).toBeInTheDocument();
  });

  it('generates the report when none is cached', async () => {
    analyzePattern.mockResolvedValue(REPORT);
    render(<PatternReportModal pattern={{ pattern: 'silent_letters', label: 'Silent letters', report: null, examples: [] }} onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent(/writing/i);
    expect(await screen.findByText(REPORT.summary)).toBeInTheDocument();
    expect(api.calls).toEqual([['silent_letters']]);
  });

  it('shows a friendly message when generation is unavailable', async () => {
    analyzePattern.mockRejectedValue(Object.assign(new Error('x'), { name: 'ApiError', status: 503 }));
    render(<PatternReportModal pattern={{ pattern: 'silent_letters', label: 'Silent letters', report: null, examples: [] }} onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/resting/i);
  });

  it.each([[429, /used all/i], [502, /not available/i]])('maps HTTP %i to a friendly message', async (status, message) => {
    analyzePattern.mockRejectedValue(Object.assign(new Error('x'), { name: 'ApiError', status }));
    render(<PatternReportModal pattern={{ pattern: 'silent_letters', label: 'Silent letters', report: null, examples: [] }} onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
