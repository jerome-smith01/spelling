import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const TABLET_MIN_VIEWPORT = 600;

const useViewport = () => {
  const read = () => window.innerWidth;
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
 * stretches with the screen up to a maximum width, docked at the bottom.
 */
export default function KeyboardFrame({ children, dock = false }) {
  const tablet = useViewport() >= TABLET_MIN_VIEWPORT;
  const frameRef = useRef(null);

  // The page leaves room for the keyboard's real height
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!tablet || !el) return undefined;
    const measure = () => document.documentElement.style.setProperty('--kb-h', `${el.offsetHeight}px`);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tablet]);
  useEffect(() => () => document.documentElement.style.removeProperty('--kb-h'), []);

  if (!tablet) {
    return dock ? <div className="vkb-dock">{children}</div> : children;
  }
  return <div ref={frameRef} className="kb-frame">{children}</div>;
}
