// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import VirtualKeyboard from './VirtualKeyboard';

afterEach(cleanup);

const setup = (props = {}) => {
  const handlers = { onChar: vi.fn(), onBackspace: vi.fn(), onEnter: vi.fn() };
  render(<VirtualKeyboard {...handlers} {...props} />);
  return handlers;
};

describe('VirtualKeyboard', () => {
  it('has letters only: no digits or symbols', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^[0-9]$/ })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^[a-z]$/ })).toHaveLength(26);
  });

  it('types lowercase by default', async () => {
    const { onChar } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'q' }));
    expect(onChar).toHaveBeenCalledWith('q');
  });

  it('shift capitalizes only the next letter', async () => {
    const { onChar } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Shift' }));
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    await userEvent.click(screen.getByRole('button', { name: 'b' }));
    expect(onChar).toHaveBeenNthCalledWith(1, 'A');
    expect(onChar).toHaveBeenNthCalledWith(2, 'b');
  });

  it('wires delete, space and check', async () => {
    const { onChar, onBackspace, onEnter } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Space' }));
    await userEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(onBackspace).toHaveBeenCalled();
    expect(onChar).toHaveBeenCalledWith(' ');
    expect(onEnter).toHaveBeenCalled();
  });

  it('disables Check when told to', () => {
    setup({ enterDisabled: true });
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  });
});
