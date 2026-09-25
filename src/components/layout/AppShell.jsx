import React from 'react';
import Header from './Header';

export default function AppShell({ activePage, onNavigate, theme, onToggleTheme, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Header
        activePage={activePage}
        onNavigate={onNavigate}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      <main style={{
        flex: 1,
        padding: '2rem 1rem',
        maxWidth: '1024px',
        width: '100%',
        margin: '0 auto'
      }}>
        {children}
      </main>
      <footer style={{
        borderTop: '1px solid var(--card-border)',
        padding: '1.25rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--muted-foreground)',
        backgroundColor: 'var(--glass-bg)'
      }}>
        Spelling Tutor &bull; Good Plus Fast
      </footer>
    </div>
  );
}
