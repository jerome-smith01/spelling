// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ColorPicker from './ColorPicker';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ColorPicker custom color editor', () => {
  it('opens the in-app editor, applies a typed hex, and closes on Done', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);

    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 1' }));
    const hex = screen.getByLabelText('Hex color');

    await user.clear(hex);
    await user.type(hex, '#ff0000');

    expect(screen.getByRole('button', { name: 'Select Custom Color 1 (#ff0000)' })).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--selected-color')).toBe('#ff0000');

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores an incomplete hex value', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 1' }));
    const hex = screen.getByLabelText('Hex color');
    await user.clear(hex);
    await user.type(hex, '#ff0');
    expect(screen.getByRole('button', { name: /Select Custom Color 1 \(#06b6d4\)/ })).toBeInTheDocument();
  });

  it('closes on Escape and on outside click', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 2' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 2' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('RGB fields update the color and the hex field', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 1' }));
    fireEvent.change(screen.getByLabelText('Red'), { target: { value: '255' } });
    fireEvent.change(screen.getByLabelText('Green'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Blue'), { target: { value: '0' } });
    expect(screen.getByLabelText('Hex color')).toHaveValue('#ff0000');
  });

  it('arrow keys on the board change saturation and brightness', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 2' }));
    const board = screen.getByRole('group', { name: /Saturation and brightness board/ });
    board.focus();
    for (let i = 0; i < 50; i++) await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Hex color')).toHaveValue('#000000');
  });

  it('hue slider changes the hue', async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    await user.click(screen.getByRole('button', { name: 'Customize Custom Color 1' }));
    const before = screen.getByLabelText('Hex color').value;
    fireEvent.change(screen.getByLabelText('Hue'), { target: { value: '0' } });
    expect(screen.getByLabelText('Hex color').value).not.toBe(before);
  });
});
