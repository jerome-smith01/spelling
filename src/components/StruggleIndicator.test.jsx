// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import StruggleIndicator from './StruggleIndicator';

afterEach(cleanup);

describe('StruggleIndicator', () => {
  it('renders nothing below the flame threshold', () => {
    const { container } = render(<StruggleIndicator friction={39} word="love" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a labelled flame at the threshold', () => {
    render(<StruggleIndicator friction={40} word="love" />);
    expect(screen.getByRole('img', { name: /tricky word: love/i })).toBeInTheDocument();
  });

  it('becomes a keyboard-reachable button when it can open a tip', async () => {
    const onClick = vi.fn();
    render(<StruggleIndicator friction={90} word="love" onClick={onClick} />);
    const button = screen.getByRole('button', { name: /tricky word: love\. tap for a tip/i });
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
