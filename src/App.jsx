import React from 'react';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '2.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '1.25rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '0.35rem 0.85rem',
          backgroundColor: '#eff6ff',
          color: '#1d4ed8',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '1rem'
        }}>
          Phase 0 Complete
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: '#00008B',
          margin: '0 0 0.75rem 0'
        }}>
          Spelling Tutor
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '1rem',
          lineHeight: 1.5,
          marginBottom: '1.5rem'
        }}>
          Syllable-guided 3rd-grade spelling practice application. App shell and Cloudflare Pages deployment pipeline verified.
        </p>
        <div style={{
          fontSize: '0.875rem',
          color: '#0ea5e9',
          fontWeight: 600
        }}>
          Live route: <code>/spelling/app/</code>
        </div>
      </div>
    </div>
  );
}
