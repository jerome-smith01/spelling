import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLearner, childrenOf } from '../hooks/useLearner';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import PinPad from '../components/PinPad';

/**
 * Route: /who — "Who's practicing?". Choosing a child starts kid mode (adult screens locked).
 * Leaving kid mode, or switching to a sibling, needs the grown-up PIN when one is set.
 */
export default function WhoPage() {
  usePageTitle("Who's practicing?");
  const { status } = useAuth();
  const { learners, activeId, kidMode, pinSet, switchTo, unlock } = useLearner();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(null); // { id } the choice waiting for the PIN
  const kids = childrenOf(learners);

  if (status !== 'authenticated' && kids.length === 0) {
    return (
      <section style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ color: 'var(--foreground)' }}>Who&apos;s practicing?</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          Log in to add your children and follow how each one is doing.
        </p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const go = async (id) => {
    await switchTo(id, { kid: id !== null });
    navigate('/');
  };

  const choose = (id) => {
    if (id === activeId && (id === null ? !kidMode : kidMode)) { navigate('/'); return; }
    // From kid mode, any other choice is a grown-up decision
    if (kidMode && pinSet) setAsking({ id });
    else go(id);
  };

  const confirmPin = async (pin) => {
    await unlock(pin);          // rejects on a wrong PIN, which PinPad shows
    const { id } = asking;
    setAsking(null);
    await go(id);
  };

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Who&apos;s practicing?</h2>
      {kids.length === 0 && (
        <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
          No children yet. <Link to="/family">Add a child</Link> to give each one their own progress.
        </p>
      )}
      <ul className="who-grid" aria-label="Choose who is practicing">
        {kids.map(k => (
          <li key={k.id}>
            <button type="button" className="who-tile" onClick={() => choose(k.id)} aria-current={k.id === activeId ? 'true' : undefined}>
              <span className="who-avatar" aria-hidden="true">{k.avatar || '🙂'}</span>
              <span className="who-name">{k.display_name}</span>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="who-tile who-tile-adult" onClick={() => choose(null)} aria-current={activeId === null ? 'true' : undefined}>
            <span className="who-avatar" aria-hidden="true">👤</span>
            <span className="who-name">Grown-up</span>
          </button>
        </li>
      </ul>
      {asking && (
        <PinPad
          title="Grown-up PIN"
          hint="Ask a grown-up to enter the PIN to switch."
          onSubmit={confirmPin}
          onCancel={() => setAsking(null)}
        />
      )}
    </section>
  );
}
