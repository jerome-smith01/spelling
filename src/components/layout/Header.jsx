import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';

export default function Header({ theme, onToggleTheme }) {
  const { pathname } = useLocation();
  return (
    <header style={{
      borderBottom: '1px solid var(--card-border)',
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background-color 0.3s ease, border-color 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* App Title & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className="app-title" style={{
            fontSize: '1.5rem',
            margin: 0,
            cursor: 'pointer'
          }}>
            {/* Full page load back to the Astro landing page (outside the SPA base path) */}
            <a href="/spelling/" style={{ color: 'inherit', textDecoration: 'none' }}>
              Spelling Tutor
            </a>
          </h1>
        </div>

        {/* Navigation Tabs (real routes, so every screen has its own URL) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--muted)',
          padding: '0.25rem',
          borderRadius: '9999px'
        }} aria-label="Main Navigation">
          {[
            { to: '/', label: 'Practice', active: pathname === '/' || pathname.startsWith('/lists/') },
            { to: '/lists', label: 'My Lists', active: pathname === '/lists' },
            { to: '/progress', label: 'Progress', active: pathname.startsWith('/progress') }
          ].map(({ to, label, active }) => (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: active ? 'var(--card-bg)' : 'transparent',
                color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions: Account menu & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <UserMenu />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '50%',
              border: '1px solid var(--card-border)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'transform 0.15s ease, background-color 0.2s ease'
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
