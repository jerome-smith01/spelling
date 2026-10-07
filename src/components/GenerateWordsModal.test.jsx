// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const lists = [{ id: 'L1', name: 'Week 5', wordsRaw: 'thou-sand\ncow' }];
const createList = vi.fn(() => 'NEW');
const saveWords = vi.fn((id) => id);
vi.mock('../hooks/useLists', () => ({ useLists: () => ({ lists, createList, saveWords, atListLimit: false }) }));
const generatePatternWords = vi.fn();
vi.mock('../services/smartApi', () => ({
  generatePatternWords: (...a) => generatePatternWords(...a),
  splitSyllables: vi.fn(async () => ({ splits: {} }))
}));
vi.mock('../services/apiService', () => ({ apiFetch: vi.fn() }));

import GenerateWordsModal from './GenerateWordsModal';

const pattern = { pattern: 'diphthongs', label: 'Diphthongs' };

describe('GenerateWordsModal', () => {
  beforeEach(() => { createList.mockClear(); saveWords.mockClear(); generatePatternWords.mockReset(); });
  afterEach(cleanup);

  it('excludes words already in lists, then adds new ones to the chosen list', async () => {
    generatePatternWords.mockResolvedValue({ words: ['cloud', 'flower', 'cow'] });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<GenerateWordsModal pattern={pattern} onClose={() => {}} onSaved={onSaved} />);
    expect(await screen.findByText('cloud')).toBeInTheDocument();
    expect(generatePatternWords).toHaveBeenCalledWith('diphthongs', ['thousand', 'cow']);
    await user.click(screen.getByRole('button', { name: 'Save words' }));
    expect(saveWords).toHaveBeenCalledWith('L1', 'thou-sand\ncow\ncloud\nflow-er');
    expect(onSaved).toHaveBeenCalledWith('L1');
  });

  it('can create a new list named after the pattern', async () => {
    generatePatternWords.mockResolvedValue({ words: ['coin'] });
    const user = userEvent.setup();
    render(<GenerateWordsModal pattern={pattern} onClose={() => {}} onSaved={() => {}} />);
    await screen.findByText('coin');
    await user.click(screen.getByRole('radio', { name: /Create a new list/ }));
    expect(screen.getByLabelText('New list name')).toHaveValue('Diphthongs practice');
    await user.click(screen.getByRole('button', { name: 'Save words' }));
    expect(createList).toHaveBeenCalledWith('Diphthongs practice', 'coin');
  });

  it('explains the daily cap', async () => {
    generatePatternWords.mockRejectedValue(Object.assign(new Error('x'), { status: 429 }));
    render(<GenerateWordsModal pattern={pattern} onClose={() => {}} onSaved={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent("today's 3 word requests");
  });
});
