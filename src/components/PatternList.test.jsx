// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import PatternList from './PatternList';

afterEach(cleanup);

const p = (pattern, label, status, misses = 3, distinct = 3) => ({ pattern, label, status, misses, distinct_words: distinct });

describe('PatternList', () => {
  it('shows an encouraging empty state when nothing is active', () => {
    render(<PatternList patterns={[]} onOpenReport={() => {}} />);
    expect(screen.getByText(/No patterns to work on yet/)).toBeInTheDocument();
  });

  it('lists active patterns with counts and opens the report for the chosen one', async () => {
    const onOpen = vi.fn();
    const silent = p('silent_letters', 'Silent letters', 'active', 8, 4);
    render(<PatternList patterns={[silent, p('blends', 'Blends', 'active')]} onOpenReport={onOpen} />);

    expect(screen.getByText('Silent letters')).toBeInTheDocument();
    expect(screen.getByText(/4 words, 8 misses/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Read report' })[0]);
    expect(onOpen).toHaveBeenCalledWith(silent);
  });

  it('summarises improved and watched patterns without report buttons', () => {
    render(
      <PatternList
        patterns={[p('digraphs', 'Digraphs', 'cleared'), p('schwa', 'Schwa sounds', 'watching', 2, 1), p('roots', 'Greek and Latin roots', 'watching', 0, 0)]}
        onOpenReport={() => {}}
      />
    );
    expect(screen.getByText(/Improved:/).closest('p')).toHaveTextContent('Digraphs');
    expect(screen.getByText(/Keeping an eye on:/)).toHaveTextContent('Schwa sounds');
    expect(screen.getByText(/Keeping an eye on:/)).not.toHaveTextContent('Greek and Latin roots'); // no misses
    expect(screen.queryByRole('button', { name: 'Read report' })).not.toBeInTheDocument();
  });
});
