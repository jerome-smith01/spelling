import React from 'react';
import { formatDay } from '../utils/progress';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1.25rem'
};

/** The latest weekly summary for the parent. `digest` is null until a week of practice exists. */
export default function DigestCard({ digest }) {
  if (!digest) {
    return (
      <section style={card} aria-labelledby="digest-heading">
        <h3 id="digest-heading" style={{ margin: 0 }}>This week</h3>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: 0 }}>
          Your first weekly summary appears after a week of practice.
        </p>
      </section>
    );
  }

  const facts = [
    ['Words practiced', digest.wordsPracticed],
    ['Sessions', digest.sessions],
    ['Letters correct', digest.accuracyPercent === null || digest.accuracyPercent === undefined ? '—' : `${digest.accuracyPercent}%`]
  ];

  return (
    <section style={card} aria-labelledby="digest-heading">
      <h3 id="digest-heading" style={{ margin: 0 }}>
        Weekly summary{' '}
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>
          {formatDay(digest.periodStart)} to {formatDay(digest.periodEnd)}
        </span>
      </h3>
      <p style={{ lineHeight: 1.6 }}>{digest.summary}</p>
      <dl style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: 0 }}>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{label}</dt>
            <dd style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{value}</dd>
          </div>
        ))}
      </dl>
      {digest.masteredWords?.length > 0 && (
        <p style={{ marginBottom: 0 }}><strong>Newly learned:</strong> {digest.masteredWords.join(', ')}</p>
      )}
    </section>
  );
}
