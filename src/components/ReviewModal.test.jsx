// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ReviewModal from './ReviewModal';
import { cellsFromSpelling } from '../utils/reviewCells';

const MSG = 'Take time to review your work.';

const gateFor = (level, typed = 'bi', word = 'boy') => ({
  modal: { level, word, cells: cellsFromSpelling(typed, word), dwellMs: 300 },
  finish: vi.fn(),
  keyRef: { current: null }
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); cleanup(); });

describe('ReviewModal', () => {
  it('shows nothing without a popup', () => {
    const { container } = render(<ReviewModal gate={{ modal: null, keyRef: { current: null } }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('level 1 is just the note and an OK button', () => {
    const gate = gateFor(1);
    render(<ReviewModal gate={gate} />);
    expect(screen.getByRole('alertdialog', { name: MSG })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Your spelling' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /OK/ }));
    expect(gate.finish).toHaveBeenCalled();
  });

  it('level 2: tap each wrong letter; a right letter does not count', () => {
    const gate = gateFor(2); // bi vs boy: b right, i wrong, and a blank at the end
    render(<ReviewModal gate={gate} />);
    fireEvent.click(screen.getByRole('button', { name: 'b: right' }));
    fireEvent.click(screen.getByRole('button', { name: 'i: tap if wrong' }));
    act(() => { vi.advanceTimersByTime(1500); });
    expect(gate.finish).not.toHaveBeenCalled(); // the blank spot is still untapped
    fireEvent.click(screen.getByRole('button', { name: /Empty spot/ }));
    act(() => { vi.advanceTimersByTime(1500); });
    expect(gate.finish).toHaveBeenCalledWith({ tries: 1 });
  });

  it('level 3: type the right letters, then Check closes it; two wrong tries fill the answer in', () => {
    const gate = gateFor(3);
    render(<ReviewModal gate={gate} />);
    act(() => gate.keyRef.current.press('o'));  // fixes the i
    act(() => gate.keyRef.current.press('x'));  // wrong for the last spot
    act(() => gate.keyRef.current.press('q'));  // wrong again: revealed
    act(() => { vi.advanceTimersByTime(3000); });
    expect(gate.finish).not.toHaveBeenCalled(); // does not close by itself
    fireEvent.click(screen.getByRole('button', { name: /Check/ }));
    expect(gate.finish).toHaveBeenCalledWith({ tries: 2 });
  });

  it('level 3 also takes a physical keyboard, and Enter closes it once the letters are right', () => {
    const gate = gateFor(3);
    render(<ReviewModal gate={gate} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(gate.finish).not.toHaveBeenCalled(); // not before the letters are right
    fireEvent.keyDown(window, { key: 'o' });
    fireEvent.keyDown(window, { key: 'y' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(gate.finish).toHaveBeenCalledWith({ tries: 0 });
  });

  it('level 3: the on-screen keyboard\'s Enter closes it too', () => {
    const gate = gateFor(3);
    render(<ReviewModal gate={gate} />);
    act(() => gate.keyRef.current.press('o'));
    act(() => gate.keyRef.current.press('y'));
    act(() => gate.keyRef.current.enter());
    expect(gate.finish).toHaveBeenCalledWith({ tries: 0 });
  });
});
