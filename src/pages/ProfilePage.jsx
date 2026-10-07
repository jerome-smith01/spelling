import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { getPatterns } from '../services/coachingApi';
import { getProfile, setGrade } from '../services/smartApi';
import PatternTable from '../components/PatternTable';
import PatternReportModal from '../components/PatternReportModal';
import GenerateWordsModal from '../components/GenerateWordsModal';

const card = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1.25rem'
};
export const GRADES = [{ value: 0, label: 'Kindergarten' }, ...[1, 2, 3, 4, 5, 6, 7, 8].map(g => ({ value: g, label: `Grade ${g}` }))];

/** Route: /profile. The student's grade, plus the pattern progress table with "Generate 5 words". */
export default function ProfilePage() {
  usePageTitle('Profile');
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const [grade, setGradeState] = useState(null);
  const [gradeMsg, setGradeMsg] = useState('');
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState('');
  const [reportFor, setReportFor] = useState(null);
  const [generateFor, setGenerateFor] = useState(null);

  const load = useCallback(async () => {
    setError('');
    const [p, rows] = await Promise.allSettled([getProfile(), getPatterns()]);
    setGradeState(p.status === 'fulfilled' ? p.value?.grade ?? 3 : 3);
    if (rows.status === 'fulfilled') setPatterns(Array.isArray(rows.value) ? rows.value : []);
    else {
      setPatterns([]);
      setError(rows.reason?.name === 'NetworkError' ? "You're offline. Your patterns will load when you're back online." : 'Could not load your patterns.');
    }
  }, []);

  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  if (status === 'loading') return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;

  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Profile</h2>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          Log in to set your child's grade, see which spelling patterns they know best, and get new practice words.
        </p>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const changeGrade = async (value) => {
    const prev = grade;
    setGradeState(value);
    setGradeMsg('');
    try {
      await setGrade(value);
      setGradeMsg('Saved');
    } catch {
      setGradeState(prev);
      setGradeMsg('Could not save. Please try again.');
    }
  };

  return (
    <section style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>Profile</h2>

      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label htmlFor="profile-grade" style={{ fontWeight: 700 }}>Grade</label>
        <select id="profile-grade" className="speed-preset-select" value={grade ?? 3} disabled={grade === null}
          onChange={(e) => changeGrade(Number(e.target.value))} aria-describedby="profile-grade-help">
          {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <span role="status" style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{gradeMsg}</span>
        <p id="profile-grade-help" style={{ flexBasis: '100%', margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
          New practice words are picked to suit this grade.
        </p>
      </div>

      {error && <div role="alert" style={{ ...card, borderColor: '#ef4444' }}>{error}</div>}
      {patterns === null
        ? <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading your patterns…</p>
        : <PatternTable patterns={patterns} userId={user?.id} onOpenReport={setReportFor} onGenerate={setGenerateFor} />}

      {reportFor && <PatternReportModal pattern={reportFor} onClose={() => setReportFor(null)} />}
      {generateFor && (
        <GenerateWordsModal
          pattern={generateFor}
          onClose={() => setGenerateFor(null)}
          onSaved={(id) => { setGenerateFor(null); navigate(`/lists/${id}`); }}
        />
      )}
    </section>
  );
}
