// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WordTable, { rowInfo } from './WordTable';

const words = [{ id: 'w1', word: 'cat' }, { id: 'w2', word: 'dog' }, { id: 'w3', word: 'owl' }];
const TODAY = '2026-10-14';
const progress = {
  words: {
    cat: { level: 3, mastered: false, lastScore: 80, due: '2026-10-16' },
    dog: { level: 5, mastered: true, lastScore: 100, due: null }
  }
};

afterEach(cleanup);

describe('rowInfo', () => {
  it('describes unstarted, in-progress, due and learned words', () => {
    expect(rowInfo(undefined, TODAY)).toMatchObject({ levelText: 'Not started', score: '—', next: 'Today' });
    expect(rowInfo(progress.words.cat, TODAY)).toMatchObject({ levelText: 'Level 3', score: '80%', levelLabel: '1 in 3 letters visible' });
    expect(rowInfo({ level: 2, due: TODAY, lastScore: null }, TODAY)).toMatchObject({ next: 'Today', score: '—' });
    expect(rowInfo(progress.words.dog, TODAY)).toMatchObject({ levelText: 'Learned', next: '—' });
  });
});

describe('WordTable', () => {
  it('lists every word with its level, last score and next review', () => {
    render(<WordTable words={words} progress={progress} today={TODAY} onSpeak={vi.fn()} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('cat')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Level 3')).toBeInTheDocument();
    expect(within(rows[0]).getByText('80%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Learned')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Not started')).toBeInTheDocument();
  });

  it('plays a word from its row', () => {
    const onSpeak = vi.fn();
    render(<WordTable words={words} progress={progress} today={TODAY} onSpeak={onSpeak} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hear dog' }));
    expect(onSpeak).toHaveBeenCalledWith('w2', 'dog');
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<WordTable words={[]} progress={progress} today={TODAY} onSpeak={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
