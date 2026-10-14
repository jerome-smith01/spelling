import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { parseWordList } from '../utils/wordParser';
import { loadDeckSummary } from '../hooks/useDeckSchedule';
import { loadLastListId } from '../services/storageService';
import { usePageTitle } from '../hooks/usePageTitle';
import { dueText } from '../utils/dueText';
import { useLearner } from '../hooks/useLearner';
import NewDeckFlow from '../components/NewDeckFlow';
import '../styles/spelling.css';

/** Route: / — every deck with its progress; the way into practice and quiz (each its own screen). */
const SORT_KEY = 'spelling_tutor_dash_sort_v1';
const SORTS = {
  recent: { label: 'Most recently added', cmp: (a, b) => b.added.localeCompare(a.added) },
  words: { label: 'Most words', cmp: (a, b) => b.total - a.total },
  difficult: { label: 'Most difficult', cmp: (a, b) => b.struggling - a.struggling || a.learned / (a.total || 1) - b.learned / (b.total || 1) },
  reviewed: { label: 'Most recently reviewed', cmp: (a, b) => b.lastReviewed.localeCompare(a.lastReviewed) },
  learned: { label: 'Most learned', cmp: (a, b) => b.learned - a.learned }
};

export default function DashboardPage() {
  usePageTitle('My decks');
  const navigate = useNavigate();
  const { kidMode, activeLearner } = useLearner();
  const { lists, defaultList, createList, atListLimit, assigned = [] } = useLists();
  const lastId = loadLastListId();
  const [sort, setSort] = useState(() => {
    try { const v = localStorage.getItem(SORT_KEY); return SORTS[v] ? v : 'recent'; } catch { return 'recent'; }
  });
  const changeSort = (v) => {
    setSort(v);
    try { localStorage.setItem(SORT_KEY, v); } catch { /* storage unavailable */ }
  };

  // A child sees only the lists assigned to them (below), never the grown-up's own decks
  const decks = useMemo(() => (kidMode ? [] : [defaultList, ...lists]).map(l => {
    const words = parseWordList(l.wordsRaw).map(w => w.word);
    return { id: l.id, name: l.name, added: l.updatedAt || '', ...loadDeckSummary(l.id, words) };
  }), [kidMode, defaultList, lists]);
  // Array.sort is stable, so ties keep their original order
  const sorted = useMemo(() => [...decks].sort(SORTS[sort].cmp), [decks, sort]);

  const [creating, setCreating] = useState(false);
  const onCreate = ({ name, wordsRaw, focusGroups, hints }) => {
    if (atListLimit) return { success: false, error: 'You have reached the 25 deck limit. Delete a deck first.' };
    if (parseWordList(wordsRaw).length === 0) return { success: false, error: 'Add at least one word.' };
    if (new TextEncoder().encode(wordsRaw).length > 20 * 1024) return { success: false, error: 'That list is too long (20 KB maximum).' };
    const id = createList(name, wordsRaw.trim(), { focusGroups, hints });
    navigate(`/lists/${id}`);
    return { success: true };
  };

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>My decks</h2>
        {!kidMode && (
          <button type="button" onClick={() => setCreating(true)} disabled={atListLimit || creating} className="btn-secondary-sm" style={{ fontWeight: 700 }}>
            + New deck
          </button>
        )}
      </div>
      {creating && (
        <NewDeckFlow
          existingNames={decks.map(d => d.name)}
          onCreate={onCreate}
          onCancel={() => setCreating(false)}
        />
      )}
      {atListLimit && !kidMode && (
        <p role="status" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>
          You have reached the 25 deck limit. Delete a deck to add another.
        </p>
      )}
      {assigned.length > 0 && (
        <section aria-labelledby="assigned-heading" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <h3 id="assigned-heading" style={{ margin: 0, color: 'var(--foreground)' }}>Assigned to {activeLearner ? activeLearner.display_name : 'you'}</h3>
          <ul className="dash-grid">
            {assigned.map(a => {
              const due = dueText(a.due_at);
              return (
                <li key={a.assignment_id} className="dash-card" aria-label={`Assigned ${a.list_name}`}>
                  <h3 className="dash-card-title">
                    <Link to={`/lists/${a.list_id}`} className="dash-card-link">{a.list_name}</Link>
                    {a.complete && <span className="deck-badge" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>Done ✓</span>}
                  </h3>
                  <div className="dash-bar" role="progressbar" aria-label="Assignment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={a.percent}>
                    <span style={{ width: `${a.percent}%` }} />
                  </div>
                  <div className="dash-card-meta">
                    <span>{a.percent}% done</span>
                    <span className={due.late ? 'dash-due' : undefined}>{due.text}</span>
                  </div>
                  <div className="dash-actions">
                    <Link to={`/lists/${a.list_id}`} className="btn-verify" aria-label={`Practice assigned ${a.list_name}`}>Practice</Link>
                    <Link to={`/lists/${a.list_id}?mode=quiz`} className="btn-secondary-sm" aria-label={`Quiz assigned ${a.list_name}`}>Quiz</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {kidMode && assigned.length === 0 && (
        <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>
          Nothing has been assigned yet. Ask your grown-up to give you a list.
        </p>
      )}
      {!kidMode && (
        <label className="settings-field" style={{ maxWidth: '16rem' }}>
          Sort by
          <select value={sort} onChange={(e) => changeSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      )}
      <ul className="dash-grid">
        {sorted.map(d => {
          const pct = d.total ? Math.round((d.learned / d.total) * 100) : 0;
          return (
            <li key={d.id} className="dash-card" aria-label={`Deck ${d.name}`}>
              <h3 className="dash-card-title">
                <Link to={`/lists/${d.id}`} className="dash-card-link">{d.name}</Link>
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
