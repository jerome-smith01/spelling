import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { getWordDetail } from '../services/coachingApi';
import { FLAME_THRESHOLD } from '../utils/friction';
import { formatSqlDate, wordAccuracy } from '../utils/progress';
import AITipModal from '../components/AITipModal';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1.25rem'
};

/** How a letter is shown: never by color alone, the miss count is always written out. */
function letterStyle(misses) {
  if (misses >= 3) return { background: '#fecaca', border: '2px solid #ef4444' };
  if (misses >= 1) return { background: '#fde68a', border: '2px solid #f59e0b' };
  return { background: 'var(--muted)', border: '2px solid var(--card-border)' };
}

/** Route: /progress/words/:word. Which letters of one word are giving the child trouble. */
export default function WordDetailPage() {
  const { word } = useParams();
  usePageTitle(`${word} — Progress`);
  const { status } = useAuth();
  const [state, setState] = useState({ status: 'loading', detail: null, error: '' });
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    let cancelled = false;
    setState({ status: 'loading', detail: null, error: '' });
    getWordDetail(word)
      .then((detail) => { if (!cancelled) setState({ status: 'ready', detail, error: '' }); })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) setState({ status: 'missing', detail: null, error: '' });
        else if (err?.name === 'AuthError') setState({ status: 'error', detail: null, error: 'Your session expired. Log in again.' });
        else setState({ status: 'error', detail: null, error: err?.message || 'Could not load this word.' });
      });
    return () => { cancelled = true; };
  }, [word, status]);

  const back = <Link to="/progress" style={{ color: 'var(--color-primary)' }}>&larr; Back to Progress</Link>;

  if (status === 'loading') return <p role="status">Loading…</p>;

  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0 }}>{word}</h2>
        <p>Log in to see how you are doing with this word.</p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const { detail } = state;
  return (
    <section style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>{back}</div>
      <h2 tabIndex={-1} style={{ margin: 0, overflowWrap: 'anywhere' }}>{word}</h2>

      {state.status === 'loading' && <p role="status">Loading…</p>}
      {state.status === 'missing' && (
        <p>We have no practice history for this word yet. Practice it and check back.</p>
      )}
      {state.status === 'error' && <p role="alert">{state.error}</p>}

      {state.status === 'ready' && (
        <>
          <div style={card}>
            <dl style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: 0 }}>
              {[
                ['Tries', detail.attempt_count],
                ['Accuracy', `${wordAccuracy(detail)}%`],
                ['Difficulty', detail.friction_score],
                ['Last practiced', formatSqlDate(detail.last_practiced)]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{label}</dt>
                  <dd style={{ margin: 0, fontWeight: 800 }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Letter by letter</h3>
            <ol aria-label={`Results for each letter of ${word}`} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: 0 }}>
              {detail.letters.map((l) => (
                <li
                  key={l.position}
                  style={{ ...letterStyle(l.misses), borderRadius: 'var(--radius-md)', padding: '0.4rem 0.6rem', textAlign: 'center', minWidth: '3rem' }}
                >
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{l.letter}</div>
                  <div style={{ fontSize: '0.7rem' }}>
                    {l.attempts === 0 ? 'not tested' : l.misses === 0 ? 'always right' : `${l.misses} ${l.misses === 1 ? 'miss' : 'misses'}`}
                  </div>
                </li>
              ))}
            </ol>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: 0 }}>
              Only letters that were hidden during practice are tested.
            </p>
          </div>

          {detail.tip ? (
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>A tip for this word</h3>
              <p><strong>Try this:</strong> {detail.tip.tip}</p>
              <p><strong>Remember it:</strong> {detail.tip.mnemonic}</p>
              <p style={{ marginBottom: 0 }}><strong>Break it apart:</strong> {detail.tip.breakdown}</p>
            </div>
          ) : detail.friction_score >= FLAME_THRESHOLD ? (
            <button type="button" className="btn-verify" style={{ alignSelf: 'flex-start' }} onClick={() => setTipOpen(true)}>
              Get a tip for this word
            </button>
          ) : null}
        </>
      )}

      {tipOpen && <AITipModal word={word} onClose={() => setTipOpen(false)} />}
    </section>
  );
}
