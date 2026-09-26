import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLists } from '../hooks/useLists';
import { usePageTitle } from '../hooks/usePageTitle';
import { apiFetch } from '../services/apiService';
import { flush, queueLength, subscribe } from '../services/attemptQueue';
import { buildLoginUrl } from '../services/apiService';
import { parseWordList } from '../utils/wordParser';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1.25rem'
};

const accuracy = (s) => (s.attempt_count > 0 ? Math.round((1 - s.error_count / s.attempt_count) * 100) : 0);

function Stat({ label, value }) {
  return (
    <div style={{ ...card, flex: '1 1 9rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--foreground)' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{label}</div>
    </div>
  );
}

/** Route: /progress — per-word attempts, accuracy and friction score. */
export default function ProgressPage() {
  usePageTitle('Progress');
  const { status } = useAuth();
  const { lists, defaultList, syncNow } = useLists();
  const [params, setParams] = useSearchParams();
  const listFilter = params.get('list') || 'all';

  const [scores, setScores] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(queueLength());

  useEffect(() => subscribe(setPending), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await flush(); // make sure the latest session is included
      setScores(await apiFetch('/api/spelling/scores'));
    } catch (err) {
      if (err.name === 'AuthError') setError('Your session expired. Log in again to see your progress.');
      else if (err.name === 'NetworkError') setError("You're offline. Progress will load when you're back online.");
      else setError(err.message || 'Could not load progress.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const filterOptions = useMemo(() => [defaultList, ...lists], [defaultList, lists]);

  const rows = useMemo(() => {
    if (!scores) return [];
    if (listFilter === 'all') return scores;
    const list = filterOptions.find(l => l.id === listFilter);
    if (!list) return scores;
    const wanted = new Set(parseWordList(list.wordsRaw).map(w => w.word));
    return scores.filter(s => wanted.has(s.word));
  }, [scores, listFilter, filterOptions]);

  if (status === 'loading') {
    return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;
  }

  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Progress</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          Log in to keep a history of every word you practice and see which ones need more work.
          {pending > 0 && ` ${pending} answers from this device are waiting and will be added when you log in.`}
        </p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>
          {status === 'expired' ? 'Log in again' : 'Log in'}
        </a>
      </section>
    );
  }

  const totalAttempts = rows.reduce((n, s) => n + s.attempt_count, 0);
  const totalErrors = rows.reduce((n, s) => n + s.error_count, 0);
  const overall = totalAttempts ? Math.round((1 - totalErrors / totalAttempts) * 100) : 0;
  const needsWork = rows.filter(s => s.friction_score > 0).length;

  return (
    <section style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Progress</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="progress-list" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
            Show:
          </label>
          <select
            id="progress-list"
            className="speed-preset-select"
            value={listFilter}
            onChange={(e) => setParams(e.target.value === 'all' ? {} : { list: e.target.value })}
          >
            <option value="all">All words</option>
            {filterOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={() => { syncNow(); load(); }}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ ...card, borderColor: '#ef4444', color: 'var(--foreground)' }}>
          {error}{' '}
          <button type="button" className="btn-secondary-sm" onClick={load}>Retry</button>
        </div>
      )}

      {!error && scores === null && (
        <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading your progress…</p>
      )}

      {scores && rows.length === 0 && !error && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--muted-foreground)' }}>
          Nothing here yet. Hide some letters, type them in and press <strong>Check</strong> on the{' '}
          <Link to="/" style={{ color: 'var(--color-primary)' }}>Practice</Link> page.
        </div>
      )}

      {scores && rows.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Stat label="Words practiced" value={rows.length} />
            <Stat label="Overall accuracy" value={`${overall}%`} />
            <Stat label="Need more practice" value={needsWork} />
          </div>

          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <caption style={{ textAlign: 'left', padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--foreground)' }}>
                Words, hardest first
              </caption>
              <thead>
                <tr style={{ color: 'var(--muted-foreground)', textAlign: 'left' }}>
                  <th scope="col" style={{ padding: '0.5rem 1rem' }}>Word</th>
                  <th scope="col" style={{ padding: '0.5rem 1rem' }}>Tries</th>
                  <th scope="col" style={{ padding: '0.5rem 1rem' }}>Accuracy</th>
                  <th scope="col" style={{ padding: '0.5rem 1rem' }}>Difficulty</th>
                  <th scope="col" style={{ padding: '0.5rem 1rem' }}>Last practiced</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const hard = Math.min(s.friction_score, 100);
                  return (
                    <tr key={s.word} style={{ borderTop: '1px solid var(--card-border)' }}>
                      <th scope="row" style={{ padding: '0.6rem 1rem', textAlign: 'left', color: 'var(--foreground)' }}>{s.word}</th>
                      <td style={{ padding: '0.6rem 1rem' }}>{s.attempt_count}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>{accuracy(s)}%</td>
                      <td style={{ padding: '0.6rem 1rem', minWidth: '9rem' }}>
                        <div
                          role="img"
                          aria-label={`Difficulty score ${s.friction_score}`}
                          style={{ height: '0.5rem', borderRadius: '9999px', background: 'var(--muted)', overflow: 'hidden' }}
                        >
                          <div style={{ width: `${hard}%`, height: '100%', background: hard >= 70 ? '#ef4444' : hard >= 40 ? '#f59e0b' : '#22c55e' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{s.friction_score}</span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--muted-foreground)' }}>
                        {s.last_practiced ? new Date(`${s.last_practiced.replace(' ', 'T')}Z`).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
