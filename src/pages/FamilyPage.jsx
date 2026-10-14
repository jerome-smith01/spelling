import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLearner, childrenOf, familyCardsOf, ownedChildrenOf } from '../hooks/useLearner';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import {
  addChild, updateChild, deleteChild, setPin, removePin, getOverview, assignList, removeAssignment, familyErrorMessage,
  createInvite, listInvites, revokeInvite, getAccess, removeAccess
} from '../services/familyApi';
import { useLists } from '../hooks/useLists';
import { dueText } from '../utils/dueText';
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
function ChildSummary({ summary, canAssign, onRemoveAssignment }) {
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
      {(summary.assignments || []).map(a => {
        const due = dueText(a.due_at);
        return (
          <li key={a.assignment_id} aria-label={`Assignment ${a.list_name}`}>
            <strong>{a.list_name}</strong>: {a.complete ? 'done ✓' : `${a.percent}% done`} · {due.text}
            {canAssign && (
              <button type="button" className="link-button" onClick={() => onRemoveAssignment(a)} aria-label={`Remove assignment ${a.list_name}`}>Remove</button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ROLE_LABEL = { guardian: 'Parent or guardian', teacher: 'Teacher', owner: 'Owner', self: 'You' };

/**
 * Share a child you added with another adult, or make a code for a student to link their own account.
 * Shows who can already see the learner (with Remove) and any codes still waiting.
 */
function SharingModal({ learner, mode, onClose, onChanged }) {
  // mode 'child': share `learner` with another adult. mode 'link': a code for a student (learner is the user's own profile).
  const [access, setAccess] = useState(null);
  const [role, setRole] = useState(mode === 'child' ? 'guardian' : 'teacher');
  const [made, setMade] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const reload = async () => {
    try { setAccess(await getAccess(learner.id)); } catch { setAccess([]); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [learner.id]);

  const make = async () => {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      setMade(await createInvite(mode === 'child' ? { kind: 'share_child', learner_id: learner.id, role } : { kind: 'link_me', role }));
    } catch (err) {
      setError(familyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(made.code); setCopied(true); } catch { /* the code is on screen to read out */ }
  };
  const remove = async (a) => {
    try { await removeAccess(learner.id, a.user_id); await reload(); await onChanged(); } catch (err) { setError(familyErrorMessage(err)); }
  };

  const title = mode === 'child' ? `Share ${learner.display_name}` : 'Follow a student';
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          {mode === 'child'
            ? `Make a code and give it to another adult. When they enter it they can see ${learner.display_name}'s progress and assign lists. You can remove them any time.`
            : 'Make a code and give it to a student who has their own login. Nothing is shared until they enter it and accept.'}
        </p>
        <label className="settings-field" style={{ maxWidth: '16rem' }}>
          They are a
          <select value={role} onChange={(e) => { setRole(e.target.value); setMade(null); }}>
            <option value="guardian">Parent or guardian</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>
        <div>
          <button type="button" className="btn-verify" onClick={make} disabled={busy}>Make a code</button>
        </div>
        {made && (
          <div aria-label="Your code" style={{ border: '2px dashed var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.3rem', color: 'var(--foreground)' }}>{made.code}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Works once, for 7 days. They enter it at Family → Join with a code.</div>
            <button type="button" className="btn-secondary-sm" style={{ marginTop: '0.5rem' }} onClick={copy}>{copied ? 'Copied' : 'Copy code'}</button>
          </div>
        )}
        {error && <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
        <div>
          <h4 style={{ margin: '0 0 0.4rem', color: 'var(--foreground)' }}>Who can see {mode === 'child' ? `${learner.display_name}'s practice` : 'your practice'}</h4>
          {access === null && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>Loading…</p>}
          {access?.length === 0 && <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>Just you.</p>}
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {(access || []).map(a => (
              <li key={a.user_id} aria-label={`Can see: ${a.label}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span>{a.label} · {ROLE_LABEL[a.role] ?? a.role}</span>
                <button type="button" className="link-button" onClick={() => remove(a)} aria-label={`Remove ${a.label}`}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ textAlign: 'right' }}><button type="button" className="btn-secondary-sm" onClick={onClose}>Done</button></div>
      </div>
    </Modal>
  );
}

/** Pick one of your saved lists, the children to give it to, and an optional due date. */
function AssignModal({ kids, startId, lists, onClose, onAssigned }) {
  const [listId, setListId] = useState(lists[0]?.id ?? '');
  const [picked, setPicked] = useState(new Set([startId]));
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async (e) => {
    e.preventDefault();
    if (!listId || picked.size === 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      await assignList({ list_id: listId, learner_ids: [...picked], due_at: due || undefined });
      await onAssigned();
    } catch (err) {
      setError(err?.status === 404
        ? 'That list is not saved to your account yet. Wait a moment for it to sync, then try again.'
        : familyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="Assign a list" onClose={onClose}>
      {lists.length === 0 ? (
        <>
          <p style={{ marginTop: 0 }}>You have no saved lists to assign yet. Make a deck first (the built-in list cannot be assigned until you edit it).</p>
          <button type="button" className="btn-secondary-sm" onClick={onClose}>Close</button>
        </>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="settings-field">
            List
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="settings-field" style={{ marginBottom: '0.25rem' }}>Give it to</legend>
            {kids.map(k => (
              <label key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                <input type="checkbox" checked={picked.has(k.id)} onChange={() => toggle(k.id)} />
                <span aria-hidden="true">{k.avatar}</span> {k.display_name}
              </label>
            ))}
          </fieldset>
          <label className="settings-field" style={{ maxWidth: '12rem' }}>
            Due date (optional)
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          {error && <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-verify" disabled={busy || picked.size === 0}>Assign</button>
          </div>
        </form>
      )}
    </Modal>
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
        First name and last initial (like Ava S.)
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
  const myself = learners.find(l => l.role === 'self');
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'add' | { editing: child }
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const kids = familyCardsOf(learners);              // children, shared children and linked students (class students are on the class page)
  const practiceIds = new Set(childrenOf(learners).map(l => l.id));
  const ownedCount = ownedChildrenOf(learners).length;
  const picks = avatars.length ? avatars : FALLBACK_AVATARS;
  const [sharing, setSharing] = useState(null);      // { learner, mode } for the sharing dialog
  const [invites, setInvites] = useState([]);
  const [watchers, setWatchers] = useState([]);       // grown-ups who can see this user's own practice
  const [summaries, setSummaries] = useState({});
  const [assigning, setAssigning] = useState(null); // the child it was opened from
  const [reload, setReload] = useState(0);
  const [sharingTick, setSharingTick] = useState(0);
  const { lists } = useLists();
  const assignable = lists.filter(l => !l.dirty && !l.deleted); // saved to the account (the built-in default is virtual)
  const kidIds = kids.map(k => k.id).join(',');

  // This week's numbers for each child, in one call. The cards still work without them.
  useEffect(() => {
    if (status !== 'authenticated' || !kidIds) return undefined;
    let cancelled = false;
    getOverview()
      .then(o => { if (!cancelled) setSummaries(Object.fromEntries((o.learners || []).map(l => [l.id, l.summary]))); })
      .catch(() => { /* offline or not allowed: show the cards without numbers */ });
    return () => { cancelled = true; };
  }, [status, kidIds, reload]);

  // Codes still waiting, and who can see the user's own practice
  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    let cancelled = false;
    listInvites().then(r => { if (!cancelled) setInvites(Array.isArray(r) ? r : []); }).catch(() => {});
    if (myself) getAccess(myself.id).then(r => { if (!cancelled) setWatchers(Array.isArray(r) ? r : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [status, myself?.id, sharingTick, sharing]); // eslint-disable-line react-hooks/exhaustive-deps

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
          disabled={mode !== null || ownedCount >= maxChildren} onClick={() => setMode('add')}>
          + Add a child
        </button>
      </div>
      <p style={{ margin: 0, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
        Children do not need their own login. Pick &ldquo;Practise as&rdquo; on a child and the app locks to their profile.
        We only keep a first name and last initial (like Ava S.), an avatar and a grade.
        {/* TODO(owner): link the Spelling Tutor privacy page "Children" section here once it is written (plan decision D11). */}
      </p>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {ownedCount >= maxChildren && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>You have added the most children allowed ({maxChildren}).</p>}

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
                  {k.role !== 'owner' && <span>{k.kind === 'self' ? 'Student' : 'Shared with you'}</span>}
                </div>
                {k.can_view_reports && (
                  <ChildSummary
                    summary={summaries[k.id]}
                    canAssign={k.can_assign}
                    onRemoveAssignment={async (a) => {
                      try { await removeAssignment(a.assignment_id); setReload(r => r + 1); } catch (err) { setError(familyErrorMessage(err)); }
                    }}
                  />
                )}
                <div className="dash-actions">
                  {practiceIds.has(k.id) && (
                    <button type="button" className="btn-verify" onClick={() => practiceAs(k.id)} aria-label={`Practise as ${k.display_name}`}>Practise as</button>
                  )}
                  {k.can_assign && (
                    <button type="button" className="btn-secondary-sm" onClick={() => setAssigning(k)} aria-label={`Assign a list to ${k.display_name}`}>Assign</button>
                  )}
                  {k.can_view_reports && (
                    <>
                      <button type="button" className="btn-secondary-sm" onClick={() => viewProgress(k.id)} aria-label={`See ${k.display_name}'s progress`}>Progress</button>
                      <Link to={`/family/${k.id}/report`} className="btn-secondary-sm" style={{ textDecoration: 'none' }} aria-label={`Report for ${k.display_name}`}>Report</Link>
                    </>
                  )}
                  {k.role === 'owner' && (
                    <>
                      <button type="button" className="btn-secondary-sm" onClick={() => setSharing({ learner: k, mode: 'child' })} aria-label={`Share ${k.display_name}`}>Share</button>
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

      <section style={card} aria-labelledby="link-heading">
        <h3 id="link-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Codes</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          Got a code from a parent, teacher or student? Join with it. Teaching students who have their own login? Make a code for them.
          Teaching a class? <Link to="/classes">Set up a class</Link> and follow everyone in one table.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/join" className="btn-verify" style={{ textDecoration: 'none' }}>Join with a code</Link>
          {myself && (
            <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={() => setSharing({ learner: myself, mode: 'link' })}>
              Make a code for a student
            </button>
          )}
        </div>
        {invites.length > 0 && (
          <ul aria-label="Codes waiting to be used" style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
            {invites.map(i => (
              <li key={i.code} aria-label={`Waiting code ${i.code}`}>
                <strong style={{ letterSpacing: '0.1rem' }}>{i.code}</strong>
                {' · '}{i.kind === 'share_child' ? `shares ${i.child_name ?? 'a child'}` : 'links a student'} · {ROLE_LABEL[i.role]}
                <button type="button" className="link-button" aria-label={`Cancel code ${i.code}`}
                  onClick={async () => { try { await revokeInvite(i.code); setSharingTick(t => t + 1); } catch (err) { setError(familyErrorMessage(err)); } }}>Cancel</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {watchers.length > 0 && (
        <section style={card} aria-labelledby="watchers-heading">
          <h3 id="watchers-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Grown-ups who can see your practice</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {watchers.map(w => (
              <li key={w.user_id} aria-label={`Can see your practice: ${w.label}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>{w.label} · {ROLE_LABEL[w.role] ?? w.role}</span>
                <button type="button" className="link-button" aria-label={`Stop ${w.label} seeing my practice`}
                  onClick={async () => { try { await removeAccess(myself.id, w.user_id); setSharingTick(t => t + 1); } catch (err) { setError(familyErrorMessage(err)); } }}>Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PinSettings pinSet={pinSet} onChanged={refresh} />
      <p style={{ margin: 0, fontSize: '0.85rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/who">Who&apos;s practising?</Link>
        {myself && <Link to={`/family/${myself.id}/report`}>Your own progress report (PDF or HTML)</Link>}
      </p>

      {sharing && (
        <SharingModal learner={sharing.learner} mode={sharing.mode} onClose={() => setSharing(null)} onChanged={async () => { setSharingTick(t => t + 1); await refresh(); }} />
      )}

      {assigning && (
        <AssignModal
          kids={kids.filter(k => k.can_assign)}
          startId={assigning.id}
          lists={assignable}
          onClose={() => setAssigning(null)}
          onAssigned={async () => { setAssigning(null); setReload(r => r + 1); }}
        />
      )}

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
