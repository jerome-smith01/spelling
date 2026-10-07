import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTutorial } from '../hooks/useTutorial';

const PAD = 8;
const CARD_W = 320;
const GAP = 14;

const findTarget = (name) => (name ? document.querySelector(`[data-tutorial="${name}"]`) : null);

/**
 * Root-level coach-mark overlay: dims the screen, cuts out the target with a dashed,
 * breathing mint ring, and shows a card with Skip / Back / Next. Tapping outside
 * (or Esc) cancels without marking the steps seen. Page scroll is locked while active.
 */
export default function TutorialOverlay() {
  const { isActive, step, index, steps, advance, back, skip, cancel } = useTutorial();
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(180);

  // Bring the target into view first, then lock scrolling so the cutout stays aligned
  useEffect(() => {
    if (!isActive) return undefined;
    findTarget(step.target)?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isActive, step?.stepKey]);

  // Track the target every frame (covers flip animations and layout shifts)
  useEffect(() => {
    if (!isActive) return undefined;
    let raf;
    const tick = () => {
      const el = findTarget(step.target);
      const r = el ? el.getBoundingClientRect() : null;
      setRect(prev => {
        if (!r) return prev === null ? prev : null;
        if (prev && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height) return prev;
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      setVp(v => (v.w === window.innerWidth && v.h === window.innerHeight ? v : { w: window.innerWidth, h: window.innerHeight }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, step?.stepKey]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [step?.stepKey, rect?.y]);

  useEffect(() => {
    if (!isActive) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey);
    cardRef.current?.querySelector('button.tut-primary')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, step?.stepKey, cancel]);

  if (!isActive) return null;

  const isLast = index === steps.length - 1;
  const spot = rect && {
    x: Math.max(0, rect.x - PAD), y: Math.max(0, rect.y - PAD),
    w: Math.min(vp.w, rect.width + PAD * 2), h: rect.height + PAD * 2
  };

  // Card position: below/above the cutout, clamped to the viewport; centered with no anchor
  const w = Math.min(CARD_W, vp.w - 24);
  let left = (vp.w - w) / 2;
  let top = (vp.h - cardH) / 2;
  if (spot && step.position !== 'center') {
    const below = spot.y + spot.h + GAP;
    const above = spot.y - GAP - cardH;
    const wantBelow = step.position !== 'above';
    top = wantBelow ? (below + cardH <= vp.h - 12 ? below : above) : (above >= 12 ? above : below);
    top = Math.max(12, Math.min(top, vp.h - cardH - 12));
    left = Math.max(12, Math.min(spot.x + spot.w / 2 - w / 2, vp.w - w - 12));
  }

  return (
    <div className="tut-root" role="dialog" aria-modal="true" aria-label={`Tutorial: ${step.title}`}>
      {/* Decorative layers are hidden from screen readers */}
      <svg className="tut-mask" width={vp.w} height={vp.h} aria-hidden="true" onClick={cancel}>
        <defs>
          <mask id="tut-hole">
            <rect width="100%" height="100%" fill="#fff" />
            {spot && <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx="14" fill="#000" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask="url(#tut-hole)" />
      </svg>
      {spot && (
        <div
          className="tut-ring"
          aria-hidden="true"
          style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
        />
      )}
      <div ref={cardRef} className="tut-card" style={{ left, top, width: w }}>
        <div className="tut-step" aria-hidden="true">
          {steps.map((s, i) => <span key={s.stepKey} className={`tut-pip ${i === index ? 'on' : ''}`} />)}
        </div>
        <h3 className="tut-title">{step.title}</h3>
        <p className="tut-body">{step.body}</p>
        <div className="tut-actions">
          <button type="button" className="tut-link" onClick={skip}>Skip</button>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {index > 0 && <button type="button" className="btn-secondary-sm" onClick={back}>Back</button>}
            <button type="button" className="btn-verify tut-primary" onClick={advance}>
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
