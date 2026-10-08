import React from 'react';
import { Link } from 'react-router-dom';
import { bucketWords } from '../utils/progress';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1rem 1.25rem'
};

const BUCKETS = [
  { key: 'mastered', title: 'Learned', emoji: '✅', empty: 'Spell a word right in 3 visits in a row to learn it.' },
  { key: 'struggling', title: 'Struggling', emoji: '🔥', empty: 'No tricky words right now.' },
  { key: 'needsPractice', title: 'Needs practice', emoji: '📝', empty: 'Nothing here.' }
];

/** Learned / Struggling / Needs-practice groups. Each word links to its detail page. */
export default function WordBuckets({ scores }) {
  const buckets = bucketWords(scores);

  return (
    <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
      {BUCKETS.map(({ key, title, emoji, empty }) => (
        <section key={key} style={card} aria-labelledby={`bucket-${key}`}>
          <h3 id={`bucket-${key}`} style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>
            <span aria-hidden="true">{emoji} </span>{title} ({buckets[key].length})
          </h3>
          {buckets[key].length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{empty}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {buckets[key].map((s) => (
                <li key={s.word}>
                  <Link to={`/progress/words/${encodeURIComponent(s.word)}`} style={{ color: 'var(--color-primary)' }}>
                    {s.word}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
