import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLearner } from '../hooks/useLearner';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { previewInvite, acceptInvite, familyErrorMessage } from '../services/familyApi';

const card = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem' };

/** Plain-language description of what a code will do, shown before anything is shared. */
export function inviteSentence(p) {
  const what = [p.can_view_reports && 'see progress and reports', p.can_assign && 'assign lists'].filter(Boolean).join(' and ');
  const role = p.role === 'teacher' ? 'a teacher' : 'a parent or guardian';
  if (p.kind === 'share_child') {
    return `${p.inviter} wants to share ${p.child_name || 'a child'} with you as ${role}. You will be able to ${what || 'see that they are practicing'}.`;
  }
  if (p.kind === 'join_class') {
    const cls = p.class_name ? ` “${p.class_name}”` : '';
    return `${p.inviter} invites you to join their class${cls}. Your teacher will be able to ${what || 'see that you are practicing'}. You can leave the class at any time.`;
  }
  return `${p.inviter} wants to follow your spelling practice as ${role}. They will be able to ${what || 'see that you are practicing'}. You can remove them at any time.`;
}

/** Route: /join and /join/:code. Enter a code, see exactly what it does, then accept. Grown-ups only. */
export default function JoinPage() {
  usePageTitle('Join with a code');
  const { code: codeParam } = useParams();
  const { status } = useAuth();
  const { refresh } = useLearner();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ?? '');
  const [preview, setPreview] = useState(null);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async (value = code) => {
    if (busy || !value.trim()) return;
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await previewInvite(value.trim()));
    } catch (err) {
      setError(familyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // A link with the code in it checks it straight away
  useEffect(() => {
    if (codeParam && status === 'authenticated') check(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam, status]);

  if (status === 'loading') return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;
  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Join with a code</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>Log in first, then enter the code you were given.</p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await acceptInvite(code.trim(), preview.kind === 'link_me' || preview.kind === 'join_class' ? nickname.trim() : undefined);
      await refresh();
      navigate('/family');
    } catch (err) {
      setError(familyErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <section style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Join with a code</h2>
      <form onSubmit={(e) => { e.preventDefault(); check(); }} style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label className="settings-field">
          Code
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
            autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}
            style={{ fontSize: '1.2rem', letterSpacing: '0.2rem', width: '11rem' }}
          />
        </label>
        <button type="submit" className="btn-verify" disabled={busy || !code.trim()}>Check code</button>
      </form>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {preview && (
        <div style={card} aria-label="What this code does">
          <p style={{ marginTop: 0, lineHeight: 1.6, color: 'var(--foreground)' }}>{inviteSentence(preview)}</p>
          {(preview.kind === 'link_me' || preview.kind === 'join_class') && (
            <label className="settings-field" style={{ maxWidth: '16rem', marginBottom: '0.75rem' }}>
              Your first name and last initial (if your profile has none)
              <input value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} autoComplete="off" />
            </label>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn-verify" onClick={accept} disabled={busy}>Accept</button>
            <Link to="/family" className="btn-secondary-sm" style={{ textDecoration: 'none' }}>No thanks</Link>
          </div>
        </div>
      )}
    </section>
  );
}
