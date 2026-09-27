import { describe, it, expect } from 'vitest';
import { hexToHsv, hsvToHex, hexToRgb, rgbToHex, hexToRgba, COLOR_PRESETS } from './ColorPicker';

describe('hexToHsv / hsvToHex', () => {
  it('converts primary colors', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 100, v: 100 });
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 100, v: 100 });
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 100, v: 100 });
  });

  it('handles black, white and grays without dividing by zero', () => {
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
    expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 100 });
    expect(hexToHsv('#808080').s).toBe(0);
  });

  it('converts HSV back to lowercase 6-digit hex', () => {
    expect(hsvToHex({ h: 0, s: 100, v: 100 })).toBe('#ff0000');
    expect(hsvToHex({ h: 0, s: 0, v: 100 })).toBe('#ffffff');
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe('#000000');
    expect(hsvToHex({ h: 217, s: 91, v: 96 })).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('round-trips presets and default custom colors exactly', () => {
    for (const hex of [...COLOR_PRESETS.map(p => p.hex), '#06b6d4', '#ec4899', '#3b82f6']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
});

describe('hexToRgb / rgbToHex', () => {
  it('round-trips', () => {
    expect(hexToRgb('#06b6d4')).toEqual({ r: 6, g: 182, b: 212 });
    expect(rgbToHex({ r: 6, g: 182, b: 212 })).toBe('#06b6d4');
  });

  it('clamps out-of-range channels', () => {
    expect(rgbToHex({ r: -5, g: 300, b: 0 })).toBe('#00ff00');
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
