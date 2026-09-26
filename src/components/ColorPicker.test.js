import { describe, it, expect } from 'vitest';
import { hexToHsl, hslToHex, hexToRgba, COLOR_PRESETS } from './ColorPicker';

describe('hexToHsl / hslToHex', () => {
  it('converts primary colors', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl('#00ff00')).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 });
  });

  it('handles black, white and grays without dividing by zero', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 });
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 });
    expect(hexToHsl('#808080').s).toBe(0);
  });

  it('converts HSL back to lowercase 6-digit hex', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff');
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000');
    expect(hslToHex({ h: 200, s: 60, l: 40 })).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('round-trips the preset colors to within rounding error', () => {
    for (const { hex } of COLOR_PRESETS) {
      const back = hslToHex(hexToHsl(hex));
      for (let i = 1; i < 7; i += 2) {
        const diff = Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(back.slice(i, i + 2), 16));
        expect(diff).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('hexToRgba', () => {
  it('builds an rgba string with the given alpha', () => {
    expect(hexToRgba('#06b6d4', 0.15)).toBe('rgba(6, 182, 212, 0.15)');
  });

  it('expands 3-digit hex', () => {
    expect(hexToRgba('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('falls back to the default green on invalid input', () => {
    expect(hexToRgba('nonsense', 0.2)).toBe('rgba(16, 185, 129, 0.2)');
  });
});
