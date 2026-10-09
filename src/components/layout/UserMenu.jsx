import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ACCOUNT_URL, buildLoginUrl } from '../../services/apiService';

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  width: '100%',
  padding: '0.55rem 0.85rem',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  textAlign: 'left',
  textDecoration: 'none',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer'
};

/**
 * Header account control, styled to match the Good Plus Fast site menu:
 * avatar + name + chevron, with email, Account Settings and Log out.
 */
export default function UserMenu() {
  const { status, user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  // The button can sit anywhere in the wrapped header: open toward whichever side has room
  const [align, setAlign] = useState('right');

  useLayoutEffect(() => {
    if (!open || !wrapRef.current || !menuRef.current) return;
    const wrap = wrapRef.current.getBoundingClientRect();
    const width = menuRef.current.offsetWidth;
    setAlign(wrap.right - width < 8 ? 'left' : 'right');
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (status === 'loading') return <span style={{ width: '5rem' }} aria-hidden="true" />;

  if (status !== 'authenticated') {
    return (
      <a href={buildLoginUrl()} className="btn-secondary-sm" style={{ fontWeight: 700, textDecoration: 'none' }}>
        {status === 'expired' ? 'Log in again' : 'Log in'}
      </a>
    );
  }

  const displayName = user.screen_name || user.name || user.email || 'Account';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.5rem',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'transparent',
          color: 'var(--foreground)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          fontWeight: 600
        }}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%' }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: '1.75rem',
              height: '1.75rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#5b3fc4',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            {initial}
          </span>
        )}
        <span style={{ maxWidth: '7.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <svg
          {...iconProps}
          width={14}
          height={14}
          style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          ref={menuRef}
          style={{
            position: 'absolute',
            ...(align === 'left' ? { left: 0 } : { right: 0 }),
            maxWidth: 'calc(100vw - 1rem)',
            top: 'calc(100% + 0.5rem)',
            minWidth: '13rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            padding: '0.25rem 0',
            zIndex: 60
          }}
        >
          <p
            style={{
              margin: 0,
              padding: '0.5rem 0.85rem',
              fontSize: '0.75rem',
              color: 'var(--muted-foreground)',
              borderBottom: '1px solid var(--card-border)',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {user.email}
          </p>
          <a role="menuitem" href={ACCOUNT_URL} style={{ ...menuItemStyle, color: 'var(--foreground)' }}>
            <svg {...iconProps} style={{ opacity: 0.6 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Account Settings
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{ ...menuItemStyle, color: '#ef4444' }}
          >
            <svg {...iconProps}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
