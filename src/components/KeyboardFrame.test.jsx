// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import KeyboardFrame from './KeyboardFrame';

beforeEach(() => { localStorage.clear(); window.innerWidth = 1024; window.innerHeight = 768; });
afterEach(cleanup);

const setup = () => render(<KeyboardFrame><div>keys</div></KeyboardFrame>);

describe('KeyboardFrame', () => {
  it('is pinned to the bottom by default and fills the tablet width', () => {
    const { container } = setup();
    const frame = container.querySelector('.kb-frame');
    expect(frame).toHaveClass('kb-pinned');
    expect(frame.style.width).toBe('1008px');
  });

  it('shows the corner handles only after tapping the icon', async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole('button', { name: /Resize from/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Move and resize the keyboard' }));
    expect(screen.getAllByRole('button', { name: /Resize from/ }).length).toBeGreaterThan(0);
  });

  it('unpins to float and pins again, remembering the choice', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await user.click(screen.getByRole('button', { name: 'Unpin the keyboard' }));
    expect(container.querySelector('.kb-frame')).toHaveClass('kb-floating');
    cleanup();
    const again = setup();
    expect(again.container.querySelector('.kb-frame')).toHaveClass('kb-floating');
    await user.click(screen.getByRole('button', { name: 'Pin the keyboard to the bottom' }));
    expect(again.container.querySelector('.kb-frame')).toHaveClass('kb-pinned');
  });

  it('arrow keys on a handle resize the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = setup();
    container.querySelector('.kb-frame').getBoundingClientRect = () => ({ left: 8, top: 500, width: 1008, height: 260 });
    await user.click(screen.getByRole('button', { name: 'Move and resize the keyboard' }));
    fireEvent.keyDown(screen.getByRole('button', { name: /top-left corner/ }), { key: 'ArrowLeft' });
    expect(parseInt(container.querySelector('.kb-frame').style.width, 10)).toBeLessThan(1008);
  });

  it('uses the plain dock on phones', () => {
    window.innerWidth = 400;
    const { container } = render(<KeyboardFrame dock><div>keys</div></KeyboardFrame>);
    expect(container.querySelector('.vkb-dock')).toBeInTheDocument();
    expect(container.querySelector('.kb-frame')).toBeNull();
  });
});
