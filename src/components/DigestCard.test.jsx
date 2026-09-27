// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DigestCard from './DigestCard';

afterEach(cleanup);

const DIGEST = {
  periodStart: '2026-09-20', periodEnd: '2026-09-27', summary: 'A great week of practice!',
  wordsPracticed: 12, sessions: 4, accuracyPercent: 85, masteredWords: ['cat', 'dog']
};

describe('DigestCard', () => {
  it('explains when there is no digest yet', () => {
    render(<DigestCard digest={null} />);
    expect(screen.getByText(/first weekly summary appears after a week of practice/i)).toBeInTheDocument();
  });

  it('shows the summary, the key numbers and mastered words', () => {
    render(<DigestCard digest={DIGEST} />);
    expect(screen.getByText('A great week of practice!')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/cat, dog/)).toBeInTheDocument();
  });

  it('shows a dash instead of a fake percentage when accuracy is unknown', () => {
    render(<DigestCard digest={{ ...DIGEST, accuracyPercent: null, masteredWords: [] }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/Newly mastered/)).not.toBeInTheDocument();
  });
});
