import React from 'react';

export default function Header({ activePage, onNavigate, theme, onToggleTheme }) {
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
          }} onClick={() => onNavigate('practice')}>
            Spelling Tutor
          </h1>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--muted)',
            color: 'var(--muted-foreground)'
          }}>
            PWA
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--muted)',
          padding: '0.25rem',
          borderRadius: '9999px'
        }} aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            aria-current={activePage === 'practice' ? 'page' : undefined}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: activePage === 'practice' ? 'var(--card-bg)' : 'transparent',
              color: activePage === 'practice' ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: activePage === 'practice' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Practice
          </button>
          <button
            type="button"
            onClick={() => onNavigate('progress')}
            aria-current={activePage === 'progress' ? 'page' : undefined}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: activePage === 'progress' ? 'var(--card-bg)' : 'transparent',
              color: activePage === 'progress' ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: activePage === 'progress' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Progress
          </button>
        </nav>

        {/* Actions: Theme Toggle & Guest Mode Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--muted-foreground)',
            fontWeight: 500
          }}>
            Local Mode
          </span>
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
