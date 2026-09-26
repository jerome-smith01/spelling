import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { buildLoginUrl } from '../services/apiService';

const DISMISS_KEY = 'spelling_tutor_auth_banner_dismissed';

function wasDismissed(status) {
  try {
    return sessionStorage.getItem(`${DISMISS_KEY}_${status}`) === '1';
  } catch {
    return false;
  }
}

/** Nudges anonymous users to log in; warns when a session has expired. */
export default function AuthBanner() {
  const { status } = useAuth();
  const [, force] = useState(0);

  if (status !== 'anonymous' && status !== 'expired') return null;
  if (wasDismissed(status)) return null;

  const expired = status === 'expired';

  const dismiss = () => {
    try {
      sessionStorage.setItem(`${DISMISS_KEY}_${status}`, '1');
    } catch {
      // ignore
    }
    force(n => n + 1);
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '1rem',
        padding: '0.7rem 1rem',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${expired ? '#f59e0b' : 'var(--card-border)'}`,
        backgroundColor: expired ? 'rgba(245, 158, 11, 0.12)' : 'var(--muted)',
        color: 'var(--foreground)',
        fontSize: '0.875rem'
      }}
    >
      <span>
        {expired
          ? 'Your session expired. Your work is saved on this device — log in again to sync it.'
          : 'Log in to save your word lists and progress to your account and use them on any device.'}
      </span>
      <span style={{ display: 'flex', gap: '0.5rem' }}>
        <a href={buildLoginUrl()} className="btn-secondary-sm" style={{ fontWeight: 700, textDecoration: 'none' }}>
          {expired ? 'Log in again' : 'Log in'}
        </a>
        <button type="button" onClick={dismiss} className="btn-secondary-sm" aria-label="Dismiss this message">
          &times;
        </button>
      </span>
    </div>
  );
}
