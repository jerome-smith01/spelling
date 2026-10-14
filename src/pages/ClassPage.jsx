import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLearner } from '../hooks/useLearner';
import { useLists } from '../hooks/useLists';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import {
  getClassOverview, addStudents, removeGroupMember, setClassCode, renameGroup, deleteGroup, assignToClass, getReport, familyErrorMessage
} from '../services/familyApi';
import { GRADES } from './ProfilePage';
import { lastPracticedText } from './FamilyPage';
import Modal from '../components/Modal';
import { FILTERS, SORTS, attentionOf, classCsv, classFileName, renderClassReportHtml, visibleStudents } from '../utils/classExport';
import { downloadText, printHtml } from '../utils/download';

const card = { backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem' };
const isoDay = (d) => d.toISOString().slice(0, 10);
const COLUMNS = [
  { key: 'name', label: 'Student' },
  { key: 'last', label: 'Last practised' },
  { key: 'sessions', label: 'Sessions this week' },
  { key: 'accuracy', label: 'Letters correct' },
  { key: 'tricky', label: 'Tricky words' }
];

/** Route: /classes/:groupId — the roster and how everyone is doing, the class code, assignments and exports. */
export default function ClassPage() {
  const { groupId } = useParams();
  const { status } = useAuth();
  const { switchTo, refresh } = useLearner();
  const { lists } = useLists();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [names, setNames] = useState('');
  const [grade, setGrade] = useState(3);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [includeStudents, setIncludeStudents] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  usePageTitle(overview ? overview.group.name : 'Class');

  const load = useCallback(async () => {
    try {
      setOverview(await getClassOverview(groupId));
      setError('');
    } catch (err) {
      setError(err?.status === 404 ? 'We could not find that class.' : familyErrorMessage(err));
    }
  }, [groupId]);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  const shown = useMemo(() => (overview ? visibleStudents([...overview.students], filter, sort) : []), [overview, filter, sort]);
  const assignable = lists.filter(l => !l.dirty && !l.deleted);

  if (status === 'loading') return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;
  if (status !== 'authenticated') {
    return (
      <section style={{ ...card, maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ marginTop: 0, color: 'var(--foreground)' }}>Class</h2>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }
  if (error && !overview) {
    return (
      <section style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ color: 'var(--foreground)' }}>Class</h2>
        <p role="alert" style={{ color: '#ef4444' }}>{error}</p>
        <Link to="/classes" className="btn-secondary-sm" style={{ textDecoration: 'none' }}>← Classes</Link>
      </section>
    );
  }
  if (!overview) return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading the class…</p>;

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    setError('');
    setNote('');
    try { await fn(); } catch (err) { setError(familyErrorMessage(err)); } finally { setBusy(''); }
  };

  const add = () => run('add', async () => {
    const list = names.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
    const r = await addStudents(groupId, list, grade);
    setNames('');
    setNote(`Added ${r.students.length} ${r.students.length === 1 ? 'student' : 'students'}${r.skipped.length ? ` (skipped duplicates: ${r.skipped.join(', ')})` : ''}.`);
    await load();
    await refresh();
  });

  const toggleCode = (enabled) => run('code', async () => { await setClassCode(groupId, enabled); setCopied(false); await load(); });
  const copyCode = async () => { try { await navigator.clipboard.writeText(overview.group.join_code); setCopied(true); } catch { /* the code is on screen */ } };

  // Reports for the class export: the class table, plus (optionally) every student's own report, 4 at a time
  const buildClassHtml = async () => {
    let studentReports = [];
    if (includeStudents) {
      const to = new Date();
      const range = { from: isoDay(new Date(to.getTime() - 27 * 86_400_000)), to: isoDay(to) };
      const ordered = [...overview.students].sort(SORTS.name);
      studentReports = new Array(ordered.length);
      let next = 0;
      let done = 0;
      const worker = async () => {
        while (next < ordered.length) {
          const i = next++;
          studentReports[i] = await getReport(ordered[i].id, range);
          setNote(`Building the report… ${++done} of ${ordered.length} students`);
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    }
    return renderClassReportHtml(overview, { studentReports });
  };
  const exportHtml = () => run('html', async () => {
    const html = await buildClassHtml();
    downloadText(classFileName(overview, 'html', includeStudents ? '-with-students' : ''), html);
    setNote('');
  });
  const exportPdf = () => run('pdf', async () => { printHtml(await buildClassHtml()); setNote('Choose “Save as PDF” in the print window.'); });
  const exportCsv = () => downloadText(classFileName(overview, 'csv'), classCsv(overview, { filter, sort }), 'text/csv;charset=utf-8');

  const viewProgress = async (id) => { await switchTo(id, { kid: false }); navigate('/progress'); };

  return (
    <section style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>{overview.group.name}</h2>
        <Link to="/classes" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700 }}>← Classes</Link>
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {note && <p role="status" style={{ margin: 0, color: 'var(--foreground)', fontSize: '0.9rem' }}>{note}</p>}

      {overview.class_patterns.length > 0 && (
        <section style={card} aria-labelledby="shared-patterns">
          <h3 id="shared-patterns" style={{ marginTop: 0, color: 'var(--foreground)' }}>Worth teaching to the whole class</h3>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {overview.class_patterns.map(p => (
              <li key={p.pattern} style={{ color: 'var(--foreground)' }}><strong>{p.label}</strong>: {p.students} students are working on this</li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ ...card, padding: '0.75rem' }} aria-label="Students">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '0.25rem 0.5rem 0.75rem' }}>
          <label className="settings-field">Show
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="settings-field">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{shown.length} of {overview.students.length} students</span>
        </div>
        {overview.students.length === 0 ? (
          <p style={{ margin: '0.5rem', color: 'var(--muted-foreground)' }}>No students yet. Add some below.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="class-table-ui" aria-label="Class progress">
              <thead>
                <tr>
                  {COLUMNS.map(c => <th key={c.key} scope="col" aria-sort={sort === c.key ? 'ascending' : undefined}>{c.label}</th>)}
                  <th scope="col">To work on</th>
                  <th scope="col">Assignments</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(s => (
                  <tr key={s.id} aria-label={`Student ${s.display_name}`}>
                    <th scope="row"><span aria-hidden="true">{s.avatar}</span> {s.display_name}</th>
                    <td>{lastPracticedText(s.summary.last_practiced).replace('Last practised ', '').replace('Has not practised yet', 'Not yet')}</td>
                    <td>{s.summary.sessions_7d}</td>
                    <td>{s.summary.accuracy_7d === null ? '—' : `${s.summary.accuracy_7d}%`}</td>
                    <td>{s.summary.struggling_words.length ? s.summary.struggling_words.join(', ') : '—'}</td>
                    <td>{s.summary.active_patterns.length ? s.summary.active_patterns.map(p => p.label).join(', ') : '—'}</td>
                    <td>{s.summary.assignments.length ? s.summary.assignments.map(a => `${a.list_name} ${a.complete ? '✓' : `${a.percent}%`}`).join(', ') : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/family/${s.id}/report`} className="link-button" aria-label={`Report for ${s.display_name}`}>Report</Link>
                      <button type="button" className="link-button" onClick={() => viewProgress(s.id)} aria-label={`See ${s.display_name}'s progress`}>Progress</button>
                      <button type="button" className="link-button" aria-label={`Remove ${s.display_name} from the class`}
                        onClick={() => run('remove', async () => { await removeGroupMember(groupId, s.id); await load(); await refresh(); })}>Remove</button>
                      {attentionOf(s.summary).length > 0 && <span className="visually-hidden">{attentionOf(s.summary).join(', ')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card} aria-labelledby="export-heading">
        <h3 id="export-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Export</h3>
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', color: 'var(--foreground)', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={includeStudents} onChange={(e) => setIncludeStudents(e.target.checked)} />
          Include a full report for each student (one per page)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn-verify" onClick={exportPdf} disabled={!!busy || overview.students.length === 0}>Class report (PDF)</button>
          <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={exportHtml} disabled={!!busy || overview.students.length === 0}>Class report (HTML)</button>
          <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={exportCsv} disabled={overview.students.length === 0}>Spreadsheet (CSV)</button>
        </div>
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>The spreadsheet follows the filter and sort above. For the PDF, choose &ldquo;Save as PDF&rdquo; as the printer.</p>
      </section>

      <section style={card} aria-labelledby="add-heading">
        <h3 id="add-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Add students</h3>
        <label className="settings-field">
          First name and last initial, one per line (like Ava S.)
          <textarea rows={5} placeholder={'Ava S.\nBen T.\nCleo R.'} value={names} onChange={(e) => setNames(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)', font: 'inherit' }} />
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <label className="settings-field">Grade
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          <button type="button" className="btn-verify" onClick={add} disabled={!!busy || !names.trim()}>Add students</button>
        </div>
      </section>

      <section style={card} aria-labelledby="code-heading">
        <h3 id="code-heading" style={{ marginTop: 0, color: 'var(--foreground)' }}>Class code</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
          Students who have their own login can join with this code (Family → Join with a code). They choose to join, and can leave any time. Close the code once everyone is in.
        </p>
        {overview.group.join_code ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong aria-label="Class code" style={{ fontSize: '1.6rem', letterSpacing: '0.3rem', color: 'var(--foreground)' }}>{overview.group.join_code}</strong>
            <button type="button" className="btn-secondary-sm" onClick={copyCode}>{copied ? 'Copied' : 'Copy code'}</button>
            <button type="button" className="btn-secondary-sm" onClick={() => toggleCode(true)} disabled={!!busy}>New code</button>
            <button type="button" className="btn-secondary-sm" onClick={() => toggleCode(false)} disabled={!!busy}>Close code</button>
          </div>
        ) : (
          <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={() => toggleCode(true)} disabled={!!busy}>Open the class code</button>
        )}
      </section>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={() => setAssigning(true)} disabled={overview.students.length === 0}>Assign a list to the class</button>
        <RenameButton name={overview.group.name} onRename={(n) => run('rename', async () => { await renameGroup(groupId, n); await load(); })} />
        <button type="button" className="btn-secondary-sm" onClick={() => setDeleting(true)}>Delete class</button>
      </div>

      {assigning && (
        <AssignClass lists={assignable} onClose={() => setAssigning(false)}
          onAssign={async (v) => { await assignToClass(groupId, v); setAssigning(false); setNote('List assigned to the class.'); await load(); }} />
      )}
      {deleting && (
        <DeleteClass name={overview.group.name} onClose={() => setDeleting(false)}
          onDelete={async (withStudents) => { await deleteGroup(groupId, withStudents); await refresh(); navigate('/classes'); }} />
      )}
    </section>
  );
}

function RenameButton({ name, onRename }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  if (!open) return <button type="button" className="btn-secondary-sm" onClick={() => { setValue(name); setOpen(true); }}>Rename</button>;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) { onRename(value.trim()); setOpen(false); } }} style={{ display: 'flex', gap: '0.4rem' }}>
      <input aria-label="Class name" value={value} maxLength={60} onChange={(e) => setValue(e.target.value)} style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }} />
      <button type="submit" className="btn-verify" disabled={!value.trim()}>Save</button>
      <button type="button" className="btn-secondary-sm" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}

function AssignClass({ lists, onClose, onAssign }) {
  const [listId, setListId] = useState(lists[0]?.id ?? '');
  const [due, setDue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!listId || busy) return;
    setBusy(true);
    setError('');
    try { await onAssign({ list_id: listId, due_at: due || undefined }); } catch (err) {
      setError(err?.status === 404 ? 'That list is not saved to your account yet. Wait a moment for it to sync, then try again.' : familyErrorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Modal title="Assign a list to the class" onClose={onClose}>
      {lists.length === 0 ? (
        <>
          <p style={{ marginTop: 0 }}>You have no saved lists to assign yet. Make a deck first.</p>
          <button type="button" className="btn-secondary-sm" onClick={onClose}>Close</button>
        </>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="settings-field">List
            <select value={listId} onChange={(e) => setListId(e.target.value)}>{lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          </label>
          <label className="settings-field" style={{ maxWidth: '12rem' }}>Due date (optional)
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          {error && <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-verify" disabled={busy}>Assign to everyone</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DeleteClass({ name, onClose, onDelete }) {
  const [withStudents, setWithStudents] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Delete ${name}?`} onClose={onClose}>
      <p style={{ marginTop: 0 }}>The class and its code are removed. The students stay in your family list unless you choose to delete their profiles too.</p>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input type="checkbox" checked={withStudents} onChange={(e) => setWithStudents(e.target.checked)} />
        Also delete the student profiles I added (hidden now, deleted for good after 30 days)
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-secondary-sm" onClick={onClose}>Keep</button>
        <button type="button" className="btn-verify" style={{ background: '#ef4444' }} disabled={busy} onClick={async () => { setBusy(true); await onDelete(withStudents); }}>Delete class</button>
      </div>
    </Modal>
  );
}
