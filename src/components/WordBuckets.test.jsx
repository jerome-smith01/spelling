// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import WordBuckets from './WordBuckets';

afterEach(cleanup);

const w = (word, friction, extra = {}) => ({ word, friction_score: friction, perfect_streak: 0, mastered_at: null, ...extra });
const renderBuckets = (scores) => render(<MemoryRouter><WordBuckets scores={scores} /></MemoryRouter>);

describe('WordBuckets', () => {
  it('lists each word in the right bucket with counts, linking to its detail page', () => {
    renderBuckets([w('cat', 0, { perfect_streak: 3 }), w('loving', 90), w('boat', 20)]);

    const mastered = screen.getByRole('region', { name: /Mastered \(1\)/ });
    expect(within(mastered).getByRole('link', { name: 'cat' })).toHaveAttribute('href', '/progress/words/cat');
    const struggling = screen.getByRole('region', { name: /Struggling \(1\)/ });
    expect(within(struggling).getByRole('link', { name: 'loving' })).toBeInTheDocument();
    const needs = screen.getByRole('region', { name: /Needs practice \(1\)/ });
    expect(within(needs).getByRole('link', { name: 'boat' })).toBeInTheDocument();
  });

  it('shows a friendly line for empty buckets', () => {
    renderBuckets([w('dog', 0)]);
    expect(screen.getByText('No tricky words right now.')).toBeInTheDocument();
    expect(screen.getByText(/master it/i)).toBeInTheDocument();
  });

  it('encodes unusual words in the link', () => {
    renderBuckets([w("don't", 50)]);
    expect(screen.getByRole('link', { name: "don't" })).toHaveAttribute('href', "/progress/words/don't");
  });
});
