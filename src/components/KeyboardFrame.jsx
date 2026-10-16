import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useKeyboardLayout from '../hooks/useKeyboardLayout';
import {
  TABLET_MIN_VIEWPORT, MARGIN, clampWidth, clampPosition, resizeFromCorner
} from '../utils/keyboardLayout';

const CORNER_LABELS = { nw: 'top-left', ne: 'top-right', sw: 'bottom-left', se: 'bottom-right' };
const STEP = 24;

const PinIcon = () => (
  <svg viewBox="0 -960 960 960" width="1.4em" height="1.4em" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="m640-480 80 80v80H520v240l-40 40-40-40v-240H240v-80l80-80v-280h-40v-80h400v80h-40v280Z" />
  </svg>
);
const ResizeIcon = () => (
  <svg viewBox="0 -960 960 960" width="1.4em" height="1.4em" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M120-120v-240h80v104l144-144 56 56-144 144h104v80H120Zm480-480-56-56 144-144H584v-80h256v256h-80v-104L600-600Z" />
  </svg>
);

const useViewport = () => {
  const read = () => ({ vw: window.innerWidth, vh: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
};

/**
 * Holds the on-screen keyboard. On phones it is the plain bottom dock (or inline); on tablets it
 * stretches to the screen, can be pinned to the bottom or floated, and resized from its corners.
 */
export default function KeyboardFrame({ children, dock = false }) {
  const { vw, vh } = useViewport();
  const tablet = vw >= TABLET_MIN_VIEWPORT;
  const [layout, update] = useKeyboardLayout();
  const [adjust, setAdjust] = useState(false);
  const frameRef = useRef(null);
  const drag = useRef(null);

  const width = layout.width == null ? vw - 2 * MARGIN : clampWidth(layout.width, vw - 2 * MARGIN);
  const [height, setHeight] = useState(0);

  // Track the real height: it sets the aspect ratio and the room the page leaves for a pinned keyboard
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!tablet || !el) return undefined;
    const measure = () => {
      setHeight(el.offsetHeight);
      document.documentElement.style.setProperty('--kb-h', layout.pinned ? `${el.offsetHeight}px` : '0px');
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tablet, layout.pinned, width]);
  useEffect(() => () => document.documentElement.style.removeProperty('--kb-h'), []);

  const pos = layout.pinned ? null : clampPosition({ x: layout.x, y: layout.y, width, height }, vw, vh);

  const togglePin = () => {
    if (layout.pinned) {
      const r = frameRef.current?.getBoundingClientRect();
      update({ pinned: false, x: r?.left ?? MARGIN, y: r?.top ?? vh - height - MARGIN });
    } else {
      update({ pinned: true });
    }
  };

  const rect = () => {
    const r = frameRef.current.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  };

  // Pointer drags (touch, pen or mouse): corners resize, the bar moves a floating keyboard
  const begin = (kind, corner) => (e) => {
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault(); // keep focus on the letter blanks
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { kind, corner, sx: e.clientX, sy: e.clientY, start: rect() };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.kind === 'move') {
      const p = clampPosition({ ...d.start, x: d.start.x + dx, y: d.start.y + dy }, vw, vh);
      update({ x: p.x, y: p.y });
    } else {
      const r = resizeFromCorner(d.start, d.corner, dx, dy, vw, vh);
      update(layout.pinned ? { width: r.width } : { width: r.width, x: r.x, y: r.y });
    }
  };
  const end = () => { drag.current = null; };

  const nudge = useCallback((corner, grow) => {
    const r = rect();
    const out = resizeFromCorner(r, corner, grow * STEP * (corner.endsWith('e') ? 1 : -1), 0, vw, vh);
    update(layout.pinned ? { width: out.width } : { width: out.width, x: out.x, y: out.y });
  }, [layout.pinned, vw, vh, update]);
  const onHandleKey = (corner) => (e) => {
    const grow = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!grow) return;
    e.preventDefault();
    nudge(corner, grow);
  };

  if (!tablet) {
    return dock ? <div className="vkb-dock">{children}</div> : children;
  }

  const style = layout.pinned
    ? { width }
    : { width, left: pos.x, top: pos.y };

  return (
    <div
      ref={frameRef}
      className={`kb-frame ${layout.pinned ? 'kb-pinned' : 'kb-floating'}${adjust ? ' kb-adjust' : ''}`}
      style={style}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="kb-bar">
        <button type="button" className="kb-btn" aria-label="Move and resize the keyboard" aria-pressed={adjust}
          onPointerDown={(e) => e.preventDefault()} onClick={() => setAdjust(a => !a)}><ResizeIcon /></button>
        {adjust && !layout.pinned && (
          <div className="kb-grip" role="presentation" onPointerDown={begin('move')}>Drag to move</div>
        )}
        <button type="button" className="kb-btn" aria-label={layout.pinned ? 'Unpin the keyboard' : 'Pin the keyboard to the bottom'}
          aria-pressed={layout.pinned} onPointerDown={(e) => e.preventDefault()} onClick={togglePin}><PinIcon /></button>
      </div>
      {children}
      {adjust && Object.keys(CORNER_LABELS).filter(c => !layout.pinned || c.startsWith('n')).map(c => (
        <button
          key={c}
          type="button"
          className={`kb-handle kb-handle-${c}`}
          aria-label={`Resize from the ${CORNER_LABELS[c]} corner`}
          onPointerDown={begin('resize', c)}
          onKeyDown={onHandleKey(c)}
        />
      ))}
    </div>
  );
}
