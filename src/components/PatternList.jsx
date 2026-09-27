import React from 'react';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1rem 1.25rem'
};

/**
 * Spelling patterns the child keeps missing (for the parent). Active patterns have
 * a "Read report" button; patterns still being watched are only summarised.
 */
export default function PatternList({ patterns, onOpenReport }) {
  const active = (patterns || []).filter((p) => p.status === 'active');
  const cleared = (patterns || []).filter((p) => p.status === 'cleared');
  const watching = (patterns || []).filter((p) => p.status === 'watching' && p.misses > 0);

  return (
    <section style={card} aria-labelledby="patterns-heading">
      <h3 id="patterns-heading" style={{ margin: '0 0 0.25rem' }}>Spelling patterns</h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
        Patterns behind the words your child misses, such as leaving off a silent e.
      </p>

      {active.length === 0 ? (
        <p style={{ margin: 0 }}>
          No patterns to work on yet. A pattern shows up here once your child misses it in three different words.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {active.map((p) => (
            <li key={p.pattern} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>
                <strong>{p.label}</strong>{' '}
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                  {p.distinct_words} words, {p.misses} misses
                </span>
              </span>
              <button type="button" className="btn-secondary-sm" onClick={() => onOpenReport(p)}>
                Read report
              </button>
            </li>
          ))}
        </ul>
      )}

      {cleared.length > 0 && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
          <strong>Improved:</strong> {cleared.map((p) => p.label).join(', ')}
        </p>
      )}
      {watching.length > 0 && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          Keeping an eye on: {watching.map((p) => p.label).join(', ')}
        </p>
      )}
    </section>
  );
}
