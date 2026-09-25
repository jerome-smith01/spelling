import React from 'react';

export default function ProgressPage() {
  return (
    <div style={{
      maxWidth: '680px',
      margin: '0 auto',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          backgroundColor: 'var(--muted)',
          color: 'var(--color-primary)',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1rem'
        }}>
          Progress Dashboard
        </div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '0.75rem',
          color: 'var(--foreground)'
        }}>
          Mastery & Attempt Insights
        </h2>
        <p style={{
          color: 'var(--muted-foreground)',
          fontSize: '0.95rem',
          lineHeight: 1.6
        }}>
          Per-word practice history, friction scores, and AI-powered coaching tips will be displayed here in Phase 4 & Phase 5.
        </p>
      </div>
    </div>
  );
}
