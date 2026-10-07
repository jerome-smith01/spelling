// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import PatternTable from './PatternTable';

const P = [
  { pattern: 'diphthongs', label: 'Diphthongs', attempts: 12, misses: 3, accuracy: 75, last_practiced: '2026-10-01 10:00:00', status: 'active' },
  { pattern: 'reversals', label: 'Letter mix-ups', attempts: 4, misses: 4, accuracy: 0, last_practiced: '2026-10-02 10:00:00', status: 'watching' }
];

describe('PatternTable', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('lists patterns least-known first with progress, attempts and status', () => {
    render(<PatternTable patterns={P} userId="u1" onOpenReport={() => {}} onGenerate={() => {}} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Letter mix-ups')).toBeInTheDocument();
    expect(within(rows[1]).getByText('75%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Working on it')).toBeInTheDocument();
  });

  it('offers Report only for active patterns and Generate only where the tagger can confirm words', async () => {
    const onGenerate = vi.fn();
    const onOpenReport = vi.fn();
    const user = userEvent.setup();
    render(<PatternTable patterns={P} userId="u1" onOpenReport={onOpenReport} onGenerate={onGenerate} />);
    expect(screen.queryByRole('button', { name: /Generate 5 words for Letter mix-ups/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate 5 words for Diphthongs' }));
    expect(onGenerate).toHaveBeenCalledWith(P[0]);
    await user.click(screen.getByRole('button', { name: 'Read the report for Diphthongs' }));
    expect(onOpenReport).toHaveBeenCalledWith(P[0]);
  });

  it('changing the sort is remembered for that user', async () => {
    const user = userEvent.setup();
    render(<PatternTable patterns={P} userId="u1" onOpenReport={() => {}} onGenerate={() => {}} />);
    await user.selectOptions(screen.getByRole('combobox'), 'recent');
    expect(localStorage.getItem('spelling_tutor_pattern_sort_v1:u1')).toBe('recent');
  });
});
