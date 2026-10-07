// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import HarveyBall from './HarveyBall';

describe('HarveyBall', () => {
  afterEach(cleanup);

  it('is a labelled image when given a label', () => {
    render(<HarveyBall quarters={2} label="Level 3 of 4" />);
    const img = screen.getByRole('img', { name: 'Level 3 of 4' });
    expect(img).toHaveAttribute('data-quarters', '2');
  });

  it('is hidden from screen readers without a label (text beside it says the level)', () => {
    const { container } = render(<HarveyBall quarters={1} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws nothing inside the ring at 0 and a full disc at 4', () => {
    const { container, rerender } = render(<HarveyBall quarters={0} />);
    expect(container.querySelector('path')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    rerender(<HarveyBall quarters={4} />);
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('clamps out-of-range values', () => {
    const { container } = render(<HarveyBall quarters={9} />);
    expect(container.querySelector('svg')).toHaveAttribute('data-quarters', '4');
  });
});
