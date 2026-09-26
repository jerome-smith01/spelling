import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { parseWordList } from '../utils/wordParser';
import { usePageTitle } from '../hooks/usePageTitle';

/** Route: /lists — every list the user can open, each with its own URL. */
export default function ListsPage() {
  usePageTitle('My lists');
  const navigate = useNavigate();
  const { lists, defaultList, createList, atListLimit } = useLists();

  const onNew = () => {
    if (atListLimit) return;
    const name = window.prompt('Name for the new list (it starts as a copy of the default words):', 'New list');
    if (!name || !name.trim()) return;
    navigate(`/lists/${createList(name, defaultList.wordsRaw)}`);
  };

  const rows = [defaultList, ...lists];

  return (
    <section style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>My lists</h2>
        <button type="button" onClick={onNew} disabled={atListLimit} className="btn-secondary-sm" style={{ fontWeight: 700 }}>
          + New list
        </button>
      </div>
      {atListLimit && (
        <p role="status" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>
          You have reached the 25 list limit. Delete a list to add another.
        </p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map(l => {
          const count = parseWordList(l.wordsRaw).length;
          return (
            <li key={l.id}>
              <Link
                to={`/lists/${l.id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  textDecoration: 'none',
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                <span style={{ fontWeight: 700 }}>{l.name}</span>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
                  {count} {count === 1 ? 'word' : 'words'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
