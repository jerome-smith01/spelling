import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildLoginUrl } from '../services/apiService';
import { getReport, familyErrorMessage } from '../services/familyApi';
import { renderReportHtml, reportFileName } from '../utils/reportHtml';
import { downloadText } from '../utils/download';

const isoDay = (d) => d.toISOString().slice(0, 10);
const PRESETS = [{ label: 'Last 4 weeks', days: 28 }, { label: 'Last 8 weeks', days: 56 }, { label: 'Last 12 weeks', days: 84 }];

/**
 * Route: /family/:learnerId/report. A print-ready report for parent-teacher meetings.
 * "Download PDF" opens the browser's print dialog (choose Save as PDF); "Download HTML" saves the
 * same report as a single file that opens anywhere. Both come from one generator, so they match.
 */
export default function ReportPage() {
  usePageTitle('Report');
  const { learnerId } = useParams();
  const { status } = useAuth();
  const frameRef = useRef(null);
  const [range, setRange] = useState({ days: 28, from: '', to: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const opts = range.from && range.to ? { from: range.from, to: range.to } : (() => {
        const to = new Date();
        const from = new Date(to.getTime() - (range.days - 1) * 86_400_000);
        return { from: isoDay(from), to: isoDay(to) };
      })();
      setReport(await getReport(learnerId, opts));
    } catch (err) {
      setReport(null);
      setError(err?.status === 404 ? 'We could not find that report.' : familyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [learnerId, range]);

  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);

  const html = useMemo(() => (report ? renderReportHtml(report) : ''), [report]);

  if (status === 'loading') return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>;
  if (status !== 'authenticated') {
    return (
      <section style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h2 tabIndex={-1} style={{ color: 'var(--foreground)' }}>Report</h2>
        <a href={buildLoginUrl()} className="btn-verify" style={{ textDecoration: 'none', display: 'inline-block' }}>Log in</a>
      </section>
    );
  }

  const downloadHtml = () => downloadText(reportFileName(report, 'html'), html);
  const printPdf = () => {
    const win = frameRef.current?.contentWindow;
    if (win) { win.focus(); win.print(); }
  };

  return (
    <section style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 tabIndex={-1} style={{ margin: 0, color: 'var(--foreground)' }}>
          Report{report ? ` · ${report.learner.self ? 'You' : report.learner.name}` : ''}
        </h2>
        <Link to="/family" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700 }}>← Family</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="settings-field">
          Period
          <select
            value={range.from ? 'custom' : range.days}
            onChange={(e) => setRange(e.target.value === 'custom' ? { ...range, from: range.from || report?.period.from || '', to: range.to || report?.period.to || '' } : { days: Number(e.target.value), from: '', to: '' })}
          >
            {PRESETS.map(p => <option key={p.days} value={p.days}>{p.label}</option>)}
            <option value="custom">Choose dates…</option>
          </select>
        </label>
        {range.from !== '' && (
          <>
            <label className="settings-field">From
              <input type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))} />
            </label>
            <label className="settings-field">To
              <input type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))} />
            </label>
          </>
        )}
        <button type="button" className="btn-verify" onClick={printPdf} disabled={!report || loading}>Download PDF</button>
        <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }} onClick={downloadHtml} disabled={!report || loading}>Download HTML</button>
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
        For the PDF, choose &ldquo;Save as PDF&rdquo; as the printer. The HTML file opens in any browser and can be emailed.
      </p>

      {loading && <p role="status" style={{ margin: 0, color: 'var(--muted-foreground)' }}>Building the report…</p>}
      {error && <p role="alert" style={{ margin: 0, color: '#ef4444' }}>{error}</p>}
      {report && (
        <iframe
          ref={frameRef}
          title={`Progress report for ${report.learner.self ? 'you' : report.learner.name}`}
          srcDoc={html}
          sandbox="allow-modals allow-same-origin"
          style={{ width: '100%', height: '70vh', minHeight: '28rem', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-xl)', background: '#fff' }}
        />
      )}
    </section>
  );
}
