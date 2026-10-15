import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { getGroups, createGroup, familyErrorMessage } from '../services/familyApi';

const card = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem' };

/** Route: /classes — a teacher's classes, and a form to make one. Grown-ups only. */
export default function ClassesPage() {
  usePageTitle('Classes');
  const { status } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await getGroups()); } catch (err) { setError(familyErrorMessage(err)); setData({ groups: [], max_classes: 5, max_students: 40 }); }
  }, []);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  if (status === 'loading') return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;
  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Classes</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>Log in to set up a class and follow how each student is doing.</p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim() || !consent || busy) return;
    setBusy(true);
    setError('');
    try {
      const g = await createGroup(name.trim());
      navigate(`/classes/${g.id}`);
    } catch (err) {
      setError(familyErrorMessage(err));
      setBusy(false);
    }
  };

  const groups = data?.groups ?? [];
  const full = data && groups.length >= data.max_classes;

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Classes</h2>
        <Link to="/family" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700 }}>← Family</Link>
      </div>
      <p style={{ margin: 0, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
        Add your students once and see at a glance who has practiced, who is stuck and which spelling pattern to teach next.
        Students do not need a login: we keep a first name and last initial (like Ava S.), an avatar and a grade. Students who do have a login can join with the class code.
      </p>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {data === null && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>Loading…</p>}

      <ul className="dash-grid" aria-label="Your classes">
        {groups.map(g => (
          <li key={g.id} className="dash-card" aria-label={`Class ${g.name}`}>
            <h3 className="dash-card-title"><Link to={`/classes/${g.id}`} className="dash-card-link">{g.name}</Link></h3>
            <div className="dash-card-meta"><span>{g.member_count} {g.member_count === 1 ? 'student' : 'students'}</span>{g.join_code && <span>Code open</span>}</div>
            <div className="dash-actions"><Link to={`/classes/${g.id}`} className="btn-verify" style={{ textDecoration: 'none' }}>Open</Link></div>
          </li>
        ))}
      </ul>

      {data && !full && (
        <form onSubmit={create} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.75rem' }} aria-label="Make a class">
          <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Make a class</h3>
          <label className="settings-field" style={{ maxWidth: '20rem' }}>
            Class name
            <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder="e.g. Room 12" />
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--foreground)' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '0.25rem' }} />
            {/* TODO(owner): have this wording checked against your terms and any school or district data rules (plan decision D11). */}
            <span>I have my school&apos;s permission to enter my students&apos; first names and last initials here, and I will not enter anything else about them.</span>
          </label>
          <div><button type="submit" className="btn-verify" disabled={!name.trim() || !consent || busy}>Make class</button></div>
        </form>
      )}
      {full && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>You have the most classes allowed ({data.max_classes}).</p>}
    </section>
  );
}
