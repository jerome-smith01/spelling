// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import KeyboardFrame from './KeyboardFrame';

beforeEach(() => { window.innerWidth = 1024; });
afterEach(cleanup);

describe('KeyboardFrame', () => {
  it('docks at the bottom on tablets, with no move, resize or pin controls', () => {
    const { container } = render(<KeyboardFrame><div>keys</div></KeyboardFrame>);
    expect(container.querySelector('.kb-frame')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses the plain dock on phones', () => {
    window.innerWidth = 400;
    const { container } = render(<KeyboardFrame dock><div>keys</div></KeyboardFrame>);
    expect(container.querySelector('.vkb-dock')).toBeInTheDocument();
    expect(container.querySelector('.kb-frame')).toBeNull();
  });
});
