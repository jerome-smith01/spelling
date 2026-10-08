import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { parseWordList } from '../utils/wordParser';
import { loadDeckSummary } from '../hooks/useDeckSchedule';
import { loadLastListId } from '../services/storageService';
import { usePageTitle } from '../hooks/usePageTitle';
import '../styles/spelling.css';

/** Route: / — every deck with its progress; the way into practice and quiz (each its own screen). */
export default function DashboardPage() {
  usePageTitle('My decks');
  const navigate = useNavigate();
  const { lists, defaultList, createList, atListLimit } = useLists();
  const lastId = loadLastListId();

  const decks = useMemo(() => [defaultList, ...lists].map(l => {
    const words = parseWordList(l.wordsRaw).map(w => w.word);
    return { id: l.id, name: l.name, ...loadDeckSummary(l.id, words) };
  }), [defaultList, lists]);

  const onNew = () => {
    if (atListLimit) return;
    const name = window.prompt('Name for the new deck (it starts as a copy of the default words):', 'New deck');
    if (!name || !name.trim()) return;
    navigate(`/lists/${createList(name, defaultList.wordsRaw)}`);
  };

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>My decks</h2>
        <button type="button" onClick={onNew} disabled={atListLimit} className="btn-secondary-sm" style={{ fontWeight: 700 }}>
          + New deck
        </button>
      </div>
      {atListLimit && (
        <p role="status" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>
          You have reached the 25 deck limit. Delete a deck to add another.
        </p>
      )}
      <ul className="dash-grid">
        {decks.map(d => {
          const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0;
          return (
            <li key={d.id} className="dash-card" aria-label={`Deck ${d.name}`}>
              <h3 className="dash-card-title">
                {d.name}
                {d.id === lastId && <span className="deck-badge" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>Last used</span>}
              </h3>
              <div className="dash-bar" role="progressbar" aria-label="Words learned" aria-valuemin={0} aria-valuemax={d.total} aria-valuenow={d.learned}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="dash-card-meta">
                <span>{d.learned} of {d.total} learned</span>
                <span className={d.due ? 'dash-due' : undefined}>{d.due} due today</span>
              </div>
              <div className="dash-actions">
                <Link to={`/lists/${d.id}`} className="btn-verify" aria-label={`Practice ${d.name}`}>Practice</Link>
                <Link to={`/lists/${d.id}?mode=quiz`} className="btn-secondary-sm" aria-label={`Quiz ${d.name}`}>Quiz</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
