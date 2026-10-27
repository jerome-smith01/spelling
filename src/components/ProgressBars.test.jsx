// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProgressBars, { computeTrendColors } from './ProgressBars';
import StageBall from './StageBall';

describe('computeTrendColors', () => {
  it('returns an empty array when attempts is empty', () => {
    expect(computeTrendColors([])).toEqual([]);
  });

  it('marks the initial attempt as green', () => {
    const colors = computeTrendColors([{ pct: 80, level: 2 }]);
    expect(colors).toEqual(['var(--progress-increase)']);
  });

  it('marks increases as green', () => {
    const attempts = [
      { pct: 100, level: 1 },
      { pct: 100, level: 2 },
      { pct: 100, level: 3 },
    ];
    expect(computeTrendColors(attempts)).toEqual([
      'var(--progress-increase)',
      'var(--progress-increase)',
      'var(--progress-increase)',
    ]);
  });

  it('marks same level as green and resets drop streak', () => {
    const attempts = [
      { pct: 100, level: 2 },
      { pct: 100, level: 2 },
    ];
    expect(computeTrendColors(attempts)).toEqual([
      'var(--progress-increase)',
      'var(--progress-increase)',
    ]);
  });

  it('marks first decrease as yellow and two consecutive decreases as red', () => {
    const attempts = [
      { pct: 100, level: 4 }, // Initial: green
      { pct: 50, level: 3 },  // 1st decrease: yellow
      { pct: 40, level: 2 },  // 2nd consecutive decrease: red
      { pct: 30, level: 1 },  // 3rd consecutive decrease: red
    ];
    expect(computeTrendColors(attempts)).toEqual([
      'var(--progress-increase)',
      'var(--progress-drop-1)',
      'var(--progress-drop-2)',
      'var(--progress-drop-2)',
    ]);
  });

  it('turns green when an increase follows a red streak', () => {
    const attempts = [
      { pct: 100, level: 3 }, // green
      { pct: 50, level: 2 },  // yellow (1st drop)
      { pct: 40, level: 1 },  // red (2nd drop)
      { pct: 100, level: 2 }, // green (increase after red)
    ];
    expect(computeTrendColors(attempts)).toEqual([
      'var(--progress-increase)',
      'var(--progress-drop-1)',
      'var(--progress-drop-2)',
      'var(--progress-increase)',
    ]);
  });

  it('resets drop streak when a decrease is followed by same level then another decrease', () => {
    const attempts = [
      { pct: 100, level: 3 }, // green
      { pct: 50, level: 2 },  // yellow (1st drop)
      { pct: 80, level: 2 },  // green (same level resets streak)
      { pct: 50, level: 1 },  // yellow (1st drop after reset)
    ];
    expect(computeTrendColors(attempts)).toEqual([
      'var(--progress-increase)',
      'var(--progress-drop-1)',
      'var(--progress-increase)',
      'var(--progress-drop-1)',
    ]);
  });
});

describe('ProgressBars', () => {
  afterEach(cleanup);

  it('returns null when attempts array is empty', () => {
    const { container } = render(<ProgressBars attempts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Harvey balls without bar elements', () => {
    const attempts = [
      { pct: 100, level: 1 },
      { pct: 50, level: 2 },
    ];
    const { container } = render(<ProgressBars attempts={attempts} />);

    // No bars or bar slots
    expect(container.querySelector('.progress-slot')).toBeNull();
    expect(container.querySelector('i')).toBeNull();

    // Renders container with aria-label
    const root = screen.getByRole('img');
    expect(root).toHaveAttribute('aria-label', 'Last 2 attempts, oldest to newest: 100% at stage 1, 50% at stage 2');

    // Renders columns with stage balls
    const cols = container.querySelectorAll('.progress-col');
    expect(cols).toHaveLength(2);
    expect(cols[0]).not.toHaveClass('is-latest');
    expect(cols[1]).toHaveClass('is-latest');

    // Balls are rendered
    const balls = container.querySelectorAll('.stage-ball');
    expect(balls).toHaveLength(2);
  });

  it('passes trend colors to stage balls', () => {
    const attempts = [
      { pct: 100, level: 3 },
      { pct: 50, level: 2 },
      { pct: 40, level: 1 },
    ];
    const { container } = render(<ProgressBars attempts={attempts} />);
    const balls = container.querySelectorAll('.stage-ball');

    // 1st ball: green
    const stroke1 = balls[0].querySelector('circle[stroke="var(--progress-increase)"]');
    expect(stroke1).not.toBeNull();

    // 2nd ball: yellow
    const stroke2 = balls[1].querySelector('circle[stroke="var(--progress-drop-1)"]');
    expect(stroke2).not.toBeNull();

    // 3rd ball: red
    const stroke3 = balls[2].querySelector('circle[stroke="var(--progress-drop-2)"]');
    expect(stroke3).not.toBeNull();
  });
});

describe('StageBall', () => {
  afterEach(cleanup);

  it('uses default stage color when color prop is omitted', () => {
    const { container } = render(<StageBall level={2} />);
    const stroke = container.querySelector('circle[stroke="var(--stage-2)"]');
    expect(stroke).not.toBeNull();
  });

  it('uses custom color prop when provided', () => {
    const { container } = render(<StageBall level={2} color="var(--progress-drop-1)" />);
    const stroke = container.querySelector('circle[stroke="var(--progress-drop-1)"]');
    expect(stroke).not.toBeNull();
  });

  it('uses custom color prop for stage 5 done checkmark', () => {
    const { container } = render(<StageBall level={5} color="var(--progress-increase)" />);
    const span = container.querySelector('.stage-ball-done');
    expect(span).toHaveStyle({ color: 'var(--progress-increase)' });
  });
});
