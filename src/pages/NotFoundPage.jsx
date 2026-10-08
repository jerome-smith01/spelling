import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { buildLoginUrl } from '../services/apiService';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage({
  title = 'Page not found',
  message = "We couldn't find that page."
}) {
  const { status } = useAuth();
  usePageTitle(title);

  return (
    <section
      style={{
        maxWidth: '560px',
        margin: '2rem auto',
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)'
      }}
    >
      <h2 tabIndex={-1} style={{ margin: '0 0 0.5rem', color: 'var(--foreground)' }}>{title}</h2>
      <p style={{ color: 'var(--muted-foreground)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>{message}</p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700 }}>My decks</Link>
        <Link to="/" className="btn-secondary-sm" style={{ textDecoration: 'none' }}>Practice</Link>
        {status !== 'authenticated' && (
          <a href={buildLoginUrl()} className="btn-secondary-sm" style={{ textDecoration: 'none' }}>
            Log in
          </a>
        )}
      </div>
    </section>
  );
}
