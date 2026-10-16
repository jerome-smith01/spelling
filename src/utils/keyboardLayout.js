// Geometry for the resizable tablet keyboard. All sizes are in px; the keyboard keeps its aspect ratio.
export const MIN_WIDTH = 320;
export const TABLET_MIN_VIEWPORT = 600;
export const MARGIN = 8;

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), Math.max(lo, hi));

export const clampWidth = (w, vw) => clamp(w, Math.min(MIN_WIDTH, vw), vw);

/** Keep a rect fully on screen. */
export const clampPosition = ({ x, y, width, height }, vw, vh) => ({
  x: clamp(x, 0, vw - width),
  y: clamp(y, 0, vh - height)
});

export const CORNERS = {
  nw: { sx: -1, sy: -1 },
  ne: { sx: 1, sy: -1 },
  sw: { sx: -1, sy: 1 },
  se: { sx: 1, sy: 1 }
};

/**
 * Drag one corner by (dx, dy): the opposite corner stays put and the aspect ratio is kept.
 * `start` is { x, y, width, height }; returns the new rect inside the viewport.
 */
export function resizeFromCorner(start, corner, dx, dy, vw, vh) {
  if (!(start.width > 0 && start.height > 0)) return { ...start }; // not laid out yet
  const { sx, sy } = CORNERS[corner];
  const ratio = start.height / start.width;
  const byX = sx * dx;
  const byY = (sy * dy) / ratio; // vertical drag expressed as a width change
  const delta = Math.abs(byX) >= Math.abs(byY) ? byX : byY;
  // Room between the fixed corner and the screen edge
  const roomW = sx > 0 ? vw - start.x : start.x + start.width;
  const roomH = sy > 0 ? vh - start.y : start.y + start.height;
  const maxWidth = Math.min(vw, roomW, roomH / ratio);
  const width = clamp(start.width + delta, Math.min(MIN_WIDTH, maxWidth), maxWidth);
  const height = width * ratio;
  return {
    width,
    height,
    x: sx > 0 ? start.x : start.x + start.width - width,
    y: sy > 0 ? start.y : start.y + start.height - height
  };
}

export const DEFAULT_LAYOUT = { pinned: true, width: null, x: 0, y: 0 };

/** Read a saved layout, falling back to the default for anything missing or corrupt. */
export function parseLayout(raw) {
  try {
    const v = JSON.parse(raw);
    const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null);
    return {
      pinned: v?.pinned !== false,
      width: num(v?.width),
      x: num(v?.x) ?? 0,
      y: num(v?.y) ?? 0
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}
