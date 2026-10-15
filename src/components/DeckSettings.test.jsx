// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeckSettings from './DeckSettings';
import { DEFAULT_PREFS } from '../utils/schedule';

vi.mock('../hooks/useTutorial', () => ({ useTutorial: () => ({ enableAll: vi.fn() }) }));

afterEach(cleanup);

const setup = (over = {}) => {
  const props = { prefs: DEFAULT_PREFS, setPrefs: vi.fn(), testDate: null, setTestDate: vi.fn(), onReset: vi.fn(), ...over };
  render(<DeckSettings {...props} />);
  return props;
};

describe('DeckSettings test date', () => {
  it('allows past dates (no min)', () => {
    setup();
    expect(screen.getByLabelText('Test date')).not.toHaveAttribute('min');
  });

  it('shows the saved date as m/d/yy', () => {
    setup({ testDate: '2026-03-07' });
    expect(screen.getByLabelText('Test date')).toHaveValue('3/7/26');
  });

  it('saves a typed m/d/yy date as YYYY-MM-DD and ignores nonsense', () => {
    const { setTestDate } = setup();
    const box = screen.getByLabelText('Test date');
    fireEvent.change(box, { target: { value: '12/5/26' } });
    fireEvent.blur(box);
    expect(setTestDate).toHaveBeenLastCalledWith('2026-12-05');
    setTestDate.mockClear();
    fireEvent.change(box, { target: { value: '13/45/26' } });
    fireEvent.blur(box);
    expect(setTestDate).not.toHaveBeenCalled();
  });

  it('clears the date when the box is emptied', () => {
    const { setTestDate } = setup({ testDate: '2026-03-07' });
    const box = screen.getByLabelText('Test date');
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    expect(setTestDate).toHaveBeenCalledWith(null);
  });
});

describe('DeckSettings view', () => {
  it('switches view with the labeled buttons', () => {
    const { setPrefs } = setup({ prefs: { ...DEFAULT_PREFS, view: 'deck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(setPrefs).toHaveBeenCalledWith({ view: 'grid' });
    expect(screen.getByRole('button', { name: 'Flashcards' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('no longer has the autoplay checkbox', () => {
    setup();
    expect(screen.queryByLabelText(/Say each word/)).not.toBeInTheDocument();
  });
});
