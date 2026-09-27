// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import Modal from './Modal';

afterEach(cleanup);

describe('Modal', () => {
  it('is an accessible, labelled dialog', () => {
    render(<Modal title="Hello" onClose={() => {}}><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('moves focus inside on open', () => {
    render(<Modal title="T" onClose={() => {}}><button type="button">Inside</button></Modal>);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape, the close button and a backdrop click', async () => {
    const onClose = vi.fn();
    const { container } = render(<Modal title="T" onClose={onClose}><p>x</p></Modal>);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(document.body.querySelector('.modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(3);

    // A click inside the dialog must not close it
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(container).toBeDefined();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Outside</button>
        <Modal title="T" onClose={() => {}}>
          <button type="button">First</button>
          <button type="button">Last</button>
        </Modal>
      </>
    );
    const dialog = screen.getByRole('dialog');

    // Tab through more times than there are focusable items: focus never leaves
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('returns focus to the element that opened it and unlocks scrolling', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(<Modal title="T" onClose={() => {}}><p>x</p></Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();

    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).not.toBe('hidden');
    opener.remove();
  });
});
