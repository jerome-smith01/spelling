// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import WordsTextarea, { wordRows } from './WordsTextarea';

describe('WordsTextarea', () => {
  afterEach(cleanup);

  it('is at least 5 lines and keeps one blank line below the words', () => {
    expect(wordRows('')).toBe(5);
    expect(wordRows('a\nb\nc')).toBe(5);
    expect(wordRows('a\nb\nc\nd')).toBe(5);
    expect(wordRows('a\nb\nc\nd\ne')).toBe(6);
    expect(wordRows(Array(12).fill('w').join('\n'))).toBe(13);
  });

  it('renders that many rows', () => {
    render(<WordsTextarea aria-label="w" value={Array(8).fill('w').join('\n')} onChange={() => {}} />);
    expect(screen.getByLabelText('w')).toHaveAttribute('rows', '9');
  });
});
