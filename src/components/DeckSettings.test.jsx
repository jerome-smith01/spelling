// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeckSettings from './DeckSettings';
import { DEFAULT_PREFS } from '../utils/schedule';

vi.mock('../hooks/useTutorial', () => ({ useTutorial: () => ({ enableAll: vi.fn() }) }));

describe('DeckSettings test date', () => {
  it('allows past dates (no min)', () => {
    render(<DeckSettings prefs={DEFAULT_PREFS} setPrefs={vi.fn()} testDate={null} setTestDate={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByLabelText('Test date')).not.toHaveAttribute('min');
  });
});
