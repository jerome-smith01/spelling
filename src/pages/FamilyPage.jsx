import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLearner, childrenOf } from '../hooks/useLearner';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { addChild, updateChild, deleteChild, setPin, removePin, getOverview, familyErrorMessage } from '../services/familyApi';
import { GRADES } from './ProfilePage';
import Modal from '../components/Modal';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1.25rem'
};
const FALLBACK_AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐢', '🐧', '🐝', '🦋', '🐳', '🦖'];

/** "today", "yesterday", "3 days ago", or "not yet" for a 'YYYY-MM-DD HH:MM:SS' UTC time. */
export function lastPracticedText(ts, now = new Date()) {
  if (!ts) return 'Has not practised yet';
  const then = new Date(`${String(ts).replace(' ', 'T')}Z`);
  if (Number.isNaN(then.getTime())) return 'Has not practised yet';
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
    Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate())) / 86_400_000);
  if (days <= 0) return 'Last practised today';
  if (days === 1) return 'Last practised yesterday';
  return `Last practised ${days} days ago`;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** This week at a glance for one child (from /supervisor/overview). */
function ChildSummary({ summary }) {
  if (!summary) return null;
  return (
    <ul className="child-summary" aria-label="This week">
      <li>{lastPracticedText(summary.last_practiced)}</li>
      <li>
        {plural(summary.sessions_7d, 'session')} on {plural(summary.days_active_7d, 'day')} this week
        {summary.accuracy_7d !== null && ` · ${summary.accuracy_7d}% of letters correct`}
      </li>
      <li>
        {plural(summary.mastered_total, 'word')} mastered
        {summary.mastered_7d > 0 && ` (${summary.mastered_7d} this week)`}
        {summary.struggling_count > 0 && ` · ${plural(summary.struggling_count, 'tricky word')}`}
      </li>
      {summary.active_patterns.length > 0 && (
        <li>To work on: {summary.active_patterns.map(p => p.label).join(', ')}</li>
      )}
    </ul>
  );
}

function ChildForm({ initial, avatars, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.display_name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? avatars[0]);
  const [grade, setGrade] = useState(initial?.grade ?? 3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ display_name: name.trim(), avatar, grade });
    } catch (err) {
      setError(familyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label className="settings-field">
        First name or nickname
        <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </label>
      <label className="settings-field" style={{ maxWidth: '12rem' }}>
        Grade
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
          {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </label>
      <div className="settings-field" role="group" aria-label="Pick an avatar">
        Avatar
        <div className="avatar-pick">
          {avatars.map(a => (
            <button key={a} type="button" aria-pressed={a === avatar} aria-label={`Avatar ${a}`} onClick={() => setAvatar(a)}>{a}</button>
          ))}
        </div>
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn-verify" disabled={!name.trim() || busy}>{submitLabel}</button>
        <button type="button" className="btn-secondary-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PinSettings({ pinSet, onChanged }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState({ text: '', bad: false });
  const [busy, setBusy] = useState(false);
  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, '').slice(0, 4));

  const run = async (fn, done) => {
    if (busy) return;
    setBusy(true);
    setMsg({ text: '', bad: false });
    try {
      await fn();
      setCurrent('');
      setNext('');
      setMsg({ text: done, bad: false });
      await onChanged();
    } catch (err) {
      setMsg({ text: familyErrorMessage(err), bad: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={card} aria-labelledby="pin-heading">
      <h3 id="pin-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Grown-up PIN</h3>
      <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6, marginTop: 0 }}>
        {pinSet
          ? 'A PIN is on. A child in kid mode needs it to switch profiles or open grown-up screens.'
          : 'Set a 4-digit PIN so a child in kid mode cannot switch profiles or open grown-up screens. Without one, kid mode can be left freely.'}
        {' '}It is a lock for a child on your device, not a password.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {pinSet && (
          <label className="settings-field">
            Current PIN
            <input type="password" inputMode="numeric" autoComplete="off" value={current} onChange={digits(setCurrent)} style={{ width: '6rem' }} />
          </label>
        )}
        <label className="settings-field">
          {pinSet ? 'New PIN' : 'PIN'}
          <input type="password" inputMode="numeric" autoComplete="off" value={next} onChange={digits(setNext)} style={{ width: '6rem' }} />
        </label>
        <button
          type="button"
          className="btn-verify"
          disabled={busy || next.length !== 4 || (pinSet && current.length !== 4)}
          onClick={() => run(() => setPin(next, pinSet ? current : undefined), pinSet ? 'PIN changed.' : 'PIN set.')}
        >
          {pinSet ? 'Change PIN' : 'Set PIN'}
        </button>
        {pinSet && (
          <button
            type="button"
            className="btn-secondary-sm"
            disabled={busy || current.length !== 4}
            onClick={() => run(() => removePin(current), 'PIN removed.')}
          >
            Remove PIN
          </button>
        )}
      </div>
      {msg.text && <p role={msg.bad ? 'alert' : 'status'} style={{ margin: '0.75rem 0 0', color: msg.bad ? '#ef4444' : 'var(--foreground)', fontSize: '0.85rem' }}>{msg.text}</p>}
    </section>
  );
}

/** Route: /family — add and manage children, start kid mode, set the grown-up PIN. Grown-ups only. */
export default function FamilyPage() {
  usePageTitle('Family');
  const { status } = useAuth();
  const { learners, pinSet, maxChildren, avatars, refresh, switchTo } = useLearner();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'add' | { editing: child }
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const kids = childrenOf(learners);
  const picks = avatars.length ? avatars : FALLBACK_AVATARS;
  const [summaries, setSummaries] = useState({});
  const kidIds = kids.map(k => k.id).join(',');

  // This week's numbers for each child, in one call. The cards still work without them.
  useEffect(() => {
    if (status !== 'authenticated' || !kidIds) return undefined;
    let cancelled = false;
    getOverview()
      .then(o => { if (!cancelled) setSummaries(Object.fromEntries((o.learners || []).map(l => [l.id, l.summary]))); })
      .catch(() => { /* offline or not allowed: show the cards without numbers */ });
    return () => { cancelled = true; };
  }, [status, kidIds]);

  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Family</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          Log in to add your children. Each child gets their own practice and progress, and you can follow how they are doing.
        </p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const practiceAs = async (id) => {
    await switchTo(id, { kid: true });
    navigate('/');
  };

  // Look at a child's progress as a grown-up: no kid-mode lock, and a banner to get back
  const viewProgress = async (id) => {
    await switchTo(id, { kid: false });
    navigate('/progress');
  };

  const confirmDelete = async () => {
    const child = removing;
    try {
      await deleteChild(child.id);
      setRemoving(null);
      await refresh();
    } catch (err) {
      setRemoving(null);
      setError(familyErrorMessage(err));
    }
  };

  return (
    <section style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Family</h2>
        <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }}
          disabled={mode !== null || kids.length >= maxChildren} onClick={() => setMode('add')}>
          + Add a child
        </button>
      </div>
      <p style={{ margin: 0, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
        Children do not need their own login. Pick &ldquo;Practise as&rdquo; on a child and the app locks to their profile.
        We only keep a first name or nickname, an avatar and a grade.
        {/* TODO(owner): link the Spelling Tutor privacy page "Children" section here once it is written (plan decision D11). */}
      </p>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {kids.length >= maxChildren && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>You have added the most children allowed ({maxChildren}).</p>}

      {mode === 'add' && (
        <div style={card}>
          <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Add a child</h3>
          <ChildForm
            avatars={picks}
            initial={{ avatar: picks[kids.length % picks.length] }}
            submitLabel="Add child"
            onCancel={() => setMode(null)}
            onSubmit={async (v) => { await addChild(v); setMode(null); await refresh(); }}
          />
        </div>
      )}

      {kids.length === 0 && mode !== 'add' && (
        <div style={card}>
          <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>No children yet. Add one to give them their own progress.</p>
        </div>
      )}

      <ul className="dash-grid" aria-label="Children">
        {kids.map(k => (
          <li key={k.id} className="dash-card" aria-label={`Child ${k.display_name}`}>
            {mode?.editing?.id === k.id ? (
              <ChildForm
                avatars={picks}
                initial={k}
                submitLabel="Save"
                onCancel={() => setMode(null)}
                onSubmit={async (v) => { await updateChild(k.id, v); setMode(null); await refresh(); }}
              />
            ) : (
              <>
                <h3 className="dash-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span aria-hidden="true" style={{ fontSize: '2rem' }}>{k.avatar || '🙂'}</span>
                  {k.display_name}
                </h3>
                <div className="dash-card-meta">
                  <span>{GRADES.find(g => g.value === k.grade)?.label ?? `Grade ${k.grade}`}</span>
                  {k.role !== 'owner' && <span>Shared with you</span>}
                </div>
                {k.can_view_reports && <ChildSummary summary={summaries[k.id]} />}
                <div className="dash-actions">
                  <button type="button" className="btn-verify" onClick={() => practiceAs(k.id)} aria-label={`Practise as ${k.display_name}`}>Practise as</button>
                  {k.can_view_reports && (
                    <>
                      <button type="button" className="btn-secondary-sm" onClick={() => viewProgress(k.id)} aria-label={`See ${k.display_name}'s progress`}>Progress</button>
                      <Link to={`/family/${k.id}/report`} className="btn-secondary-sm" style={{ textDecoration: 'none' }} aria-label={`Report for ${k.display_name}`}>Report</Link>
                    </>
                  )}
                  {k.role === 'owner' && (
                    <>
                      <button type="button" className="btn-secondary-sm" onClick={() => setMode({ editing: k })} aria-label={`Edit ${k.display_name}`}>Edit</button>
                      <button type="button" className="btn-secondary-sm" onClick={() => setRemoving(k)} aria-label={`Delete ${k.display_name}`}>Delete</button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <PinSettings pinSet={pinSet} onChanged={refresh} />
      <p style={{ margin: 0, fontSize: '0.85rem' }}><Link to="/who">Who&apos;s practising?</Link></p>

      {removing && (
        <Modal title={`Delete ${removing.display_name}?`} onClose={() => setRemoving(null)}>
          <p style={{ marginTop: 0 }}>
            {removing.display_name}&apos;s practice history will be hidden now and deleted for good after 30 days.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => setRemoving(null)}>Keep</button>
            <button type="button" className="btn-verify" style={{ background: '#ef4444' }} onClick={confirmDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
