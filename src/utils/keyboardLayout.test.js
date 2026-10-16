import { describe, it, expect } from 'vitest';
import { clampWidth, clampPosition, resizeFromCorner, parseLayout } from './keyboardLayout';

const start = { x: 100, y: 400, width: 400, height: 200 };

describe('keyboardLayout', () => {
  it('clamps width to the viewport and a minimum', () => {
    expect(clampWidth(5000, 1024)).toBe(1024);
    expect(clampWidth(10, 1024)).toBe(320);
  });

  it('keeps a rect on screen', () => {
    expect(clampPosition({ x: -50, y: 900, width: 400, height: 200 }, 1000, 800)).toEqual({ x: 0, y: 600 });
  });

  it('resizes from the bottom-right corner keeping the top-left fixed and the aspect ratio', () => {
    const r = resizeFromCorner(start, 'se', 100, 0, 1024, 768);
    expect(r.width).toBe(500);
    expect(r.height).toBe(250);
    expect(r.x).toBe(100);
    expect(r.y).toBe(400);
  });

  it('resizes from the top-left corner keeping the bottom-right fixed', () => {
    const r = resizeFromCorner(start, 'nw', -100, 0, 1024, 768);
    expect(r.width).toBe(500);
    expect(r.x + r.width).toBe(500);
    expect(r.y + r.height).toBe(600);
  });

  it('a vertical drag also resizes', () => {
    const r = resizeFromCorner(start, 'ne', 0, -50, 1024, 768);
    expect(r.width).toBe(500);
  });

  it('never grows past the screen edge', () => {
    const r = resizeFromCorner(start, 'se', 5000, 0, 1024, 768);
    expect(r.x + r.width).toBeLessThanOrEqual(1024);
    expect(r.y + r.height).toBeLessThanOrEqual(768);
  });

  it('never shrinks below the minimum', () => {
    expect(resizeFromCorner(start, 'se', -5000, 0, 1024, 768).width).toBe(320);
  });

  it('falls back to defaults for corrupt saved data', () => {
    expect(parseLayout('not json')).toEqual({ pinned: true, width: null, x: 0, y: 0 });
    expect(parseLayout('{"pinned":false,"width":500,"x":10,"y":20}')).toEqual({ pinned: false, width: 500, x: 10, y: 20 });
  });
});
