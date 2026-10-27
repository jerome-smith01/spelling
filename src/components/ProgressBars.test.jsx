// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProgressBars, { computeTrendColors } from './ProgressBars';
import StageBall from './StageBall';

// ---------------------------------------------------------------------------
// computeTrendColors — uses look-forward comparison.
// history[i].level is the stage *before* attempt i was graded.
// The direction for entry i is determined by comparing attempts[i+1].level
// (or currentLevel for the last entry) against attempts[i].level.
// ---------------------------------------------------------------------------
describe('computeTrendColors', () => {
  it('returns an empty array when attempts is empty', () => {
    expect(computeTrendColors([])).toEqual([]);
  });

  it('shows green for a single entry when currentLevel is higher (advance)', () => {
    // Attempted at level 1, now at level 2 → increase
    expect(computeTrendColors([{ pct: 100, level: 1 }], 2)).toEqual(['var(--progress-increase)']);
  });

  it('shows yellow for a single entry when currentLevel is lower (drop)', () => {
    // Attempted at level 2, now at level 1 → first drop
    expect(computeTrendColors([{ pct: 50, level: 2 }], 1)).toEqual(['var(--progress-drop-1)']);
  });

  it('shows green for a single entry when currentLevel equals (same, no drop)', () => {
    // Attempted at level 2, still at level 2
    expect(computeTrendColors([{ pct: 80, level: 2 }], 2)).toEqual(['var(--progress-increase)']);
  });

  it('shows green for a single entry when currentLevel is unknown', () => {
    // No currentLevel supplied — fall back to neutral/green
    expect(computeTrendColors([{ pct: 100, level: 1 }], null)).toEqual(['var(--progress-increase)']);
  });

  it('marks a sequence of advances as green', () => {
    // level sequence in history: 1→2→3. currentLevel = 3 (last was a pass at lv3 → advanced to 4 but capped).
    // Actually: entry0 starts at 1, next entry starts at 2 → advance. 
    //           entry1 starts at 2, next entry starts at 3 → advance.
    //           entry2 starts at 3, currentLevel = 4 → advance.
    const attempts = [
      { pct: 100, level: 1 },
      { pct: 100, level: 2 },
      { pct: 100, level: 3 },
    ];
    expect(computeTrendColors(attempts, 4)).toEqual([
      'var(--progress-increase)',
      'var(--progress-increase)',
      'var(--progress-increase)',
    ]);
  });

  it('marks drops correctly: first drop yellow, second+ red', () => {
    // Sequence: started lv3, dropped to lv2, dropped to lv1. currentLevel=1.
    // entry0: level=3, next starts at 2 → decrease (1st drop) → yellow
    // entry1: level=2, next starts at 1 → decrease (2nd drop) → red
    // entry2: level=1, currentLevel=1 → same → green (reset!)
    // Wait — if the user is STILL at lv1, the last attempt was a stay, not a drop.
    // Let me model consecutive drops with currentLevel that is still dropping:
    // entry0: lv4, next=lv3 → 1st drop → yellow
    // entry1: lv3, next=lv2 → 2nd drop → red
    // entry2: lv2, currentLevel=lv1 → 3rd drop → red
    const attempts = [
      { pct: 50, level: 4 },
      { pct: 40, level: 3 },
      { pct: 30, level: 2 },
    ];
    expect(computeTrendColors(attempts, 1)).toEqual([
      'var(--progress-drop-1)',
      'var(--progress-drop-2)',
      'var(--progress-drop-2)',
    ]);
  });

  it('resets to green on an increase after a drop streak', () => {
    // entry0: lv3, next=lv2 → 1st drop → yellow
    // entry1: lv2, next=lv1 → 2nd drop → red
    // entry2: lv1, currentLevel=lv2 → increase → green (streak reset)
    const attempts = [
      { pct: 50, level: 3 },
      { pct: 40, level: 2 },
      { pct: 100, level: 1 },
    ];
    expect(computeTrendColors(attempts, 2)).toEqual([
      'var(--progress-drop-1)',
      'var(--progress-drop-2)',
      'var(--progress-increase)',
    ]);
  });

  it('same level between entries resets drop streak', () => {
    // entry0: lv3, next=lv2 → 1st drop → yellow
    // entry1: lv2, next=lv2 (same) → neutral → green (streak reset)
    // entry2: lv2, currentLevel=lv1 → 1st drop → yellow (not red, streak was reset)
    const attempts = [
      { pct: 50, level: 3 },
      { pct: 80, level: 2 },
      { pct: 50, level: 2 },
    ];
    expect(computeTrendColors(attempts, 1)).toEqual([
      'var(--progress-drop-1)',
      'var(--progress-increase)',
      'var(--progress-drop-1)',
    ]);
  });

  it('correctly shows green for a misspell that did not cause a level change (first attempt at lv1)', () => {
    // User misspelled at level 1 — can't drop below 1, so still at 1.
    // entry0: lv1, next=lv1 (stay) → neutral → green
    // entry1: lv1, currentLevel=1 → neutral → green
    const attempts = [
      { pct: 100, level: 1 },
      { pct: 40, level: 1 },
    ];
    expect(computeTrendColors(attempts, 1)).toEqual([
      'var(--progress-increase)',
      'var(--progress-increase)',
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
    const { container } = render(<ProgressBars attempts={attempts} currentLevel={1} />);

    // No bars or bar slots
    expect(container.querySelector('.progress-slot')).toBeNull();
    expect(container.querySelector('i')).toBeNull();

    // Container has aria-label
    const root = screen.getByRole('img');
    expect(root).toHaveAttribute(
      'aria-label',
      'Last 2 attempts, oldest to newest: 100% at stage 1, 50% at stage 2'
    );

    // Columns
    const cols = container.querySelectorAll('.progress-col');
    expect(cols).toHaveLength(2);
    expect(cols[0]).not.toHaveClass('is-latest');
    expect(cols[1]).toHaveClass('is-latest');

    // Stage balls rendered
    expect(container.querySelectorAll('.stage-ball')).toHaveLength(2);
  });

  it('passes correct trend colors to stage balls', () => {
    // entry0: lv3, next starts at lv2 → 1st drop → yellow ring
    // entry1: lv2, next starts at lv1 → 2nd drop → red ring
    // entry2: lv1, currentLevel=lv2 → increase → green ring
    const attempts = [
      { pct: 50, level: 3 },
      { pct: 40, level: 2 },
      { pct: 100, level: 1 },
    ];
    const { container } = render(<ProgressBars attempts={attempts} currentLevel={2} />);
    const balls = container.querySelectorAll('.stage-ball');

    // 1st ball: yellow (first drop)
    expect(balls[0].querySelector('circle[stroke="var(--progress-drop-1)"]')).not.toBeNull();
    // 2nd ball: red (2nd consecutive drop)
    expect(balls[1].querySelector('circle[stroke="var(--progress-drop-2)"]')).not.toBeNull();
    // 3rd ball: green (increase after drops)
    expect(balls[2].querySelector('circle[stroke="var(--progress-increase)"]')).not.toBeNull();
  });
});

describe('StageBall color prop', () => {
  afterEach(cleanup);

  it('uses default stage color when color prop is omitted', () => {
    const { container } = render(<StageBall level={2} />);
    expect(container.querySelector('circle[stroke="var(--stage-2)"]')).not.toBeNull();
  });

  it('uses custom color prop when provided', () => {
    const { container } = render(<StageBall level={2} color="var(--progress-drop-1)" />);
    expect(container.querySelector('circle[stroke="var(--progress-drop-1)"]')).not.toBeNull();
  });

  it('uses custom color prop for stage 5 done checkmark', () => {
    const { container } = render(<StageBall level={5} color="var(--progress-increase)" />);
    expect(container.querySelector('.stage-ball-done')).toHaveStyle({
      color: 'var(--progress-increase)',
    });
  });
});
