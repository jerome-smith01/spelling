/**
 * Class exports: a CSV for a spreadsheet, and the class report as one self-contained HTML document
 * (the same string is printed to PDF and saved as the HTML download). The class page can append every
 * student's own report after the class table.
 */
import { esc, REPORT_CSS, renderReportBody } from './reportHtml';

const CLASS_CSS = `
.class-table{margin-top:10px}
.class-table th,.class-table td{font-size:12px}
.pill{display:inline-block;border:1px solid #475569;border-radius:99px;padding:0 7px;font-size:11px;margin-right:4px}
.student-page{break-before:page;page-break-before:always}
.cover-note{font-size:12px;color:#475569}
`;

const prettyDay = (ts) => {
  if (!ts) return 'Not yet';
  const d = new Date(`${String(ts).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? 'Not yet' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const assignmentText = (summary) =>
  (summary.assignments || []).map(a => `${a.list_name}: ${a.complete ? 'done' : `${a.percent}%`}`).join('; ');

/** "Needs a look" reasons for the table, in plain words. */
export function attentionOf(summary) {
  const out = [];
  if (summary.sessions_7d === 0) out.push('No practice this week');
  if (summary.struggling_count > 0) out.push(`${summary.struggling_count} tricky ${summary.struggling_count === 1 ? 'word' : 'words'}`);
  return out;
}

/** Sort/filter used by the class page and the exports, so what you see is what you save. */
export const FILTERS = {
  all: { label: 'Everyone', test: () => true },
  quiet: { label: 'No practice this week', test: s => s.summary.sessions_7d === 0 },
  tricky: { label: 'Has tricky words', test: s => s.summary.struggling_count > 0 }
};
export const SORTS = {
  name: (a, b) => a.display_name.localeCompare(b.display_name),
  last: (a, b) => (b.summary.last_practiced || '').localeCompare(a.summary.last_practiced || '') || a.display_name.localeCompare(b.display_name),
  sessions: (a, b) => b.summary.sessions_7d - a.summary.sessions_7d || a.display_name.localeCompare(b.display_name),
  accuracy: (a, b) => (a.summary.accuracy_7d ?? 101) - (b.summary.accuracy_7d ?? 101) || a.display_name.localeCompare(b.display_name),
  tricky: (a, b) => b.summary.struggling_count - a.summary.struggling_count || a.display_name.localeCompare(b.display_name)
};
export const visibleStudents = (students, filter = 'all', sort = 'name') =>
  students.filter(FILTERS[filter]?.test ?? FILTERS.all.test).sort(SORTS[sort] ?? SORTS.name);

// A cell that starts with = + - @ would run as a formula when the CSV is opened in a spreadsheet
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEADER = ['Student', 'Last practised', 'Sessions this week', 'Days practised', 'Letters correct %', 'Words mastered', 'Tricky words', 'Patterns to work on', 'Assignments'];

export function classCsv(overview, { filter = 'all', sort = 'name' } = {}) {
  const rows = visibleStudents([...overview.students], filter, sort).map(s => [
    s.display_name,
    s.summary.last_practiced ? s.summary.last_practiced.slice(0, 10) : '',
    s.summary.sessions_7d,
    s.summary.days_active_7d,
    s.summary.accuracy_7d ?? '',
    s.summary.mastered_total,
    s.summary.struggling_words.join(' '),
    s.summary.active_patterns.map(p => p.label).join('; '),
    assignmentText(s.summary)
  ]);
  return [CSV_HEADER, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** The class report document. `studentReports` (optional) are full per-student reports appended one per page. */
export function renderClassReportHtml(overview, { studentReports = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const students = [...overview.students].sort(SORTS.name);
  const rows = students.map(s => `<tr>
<td><strong>${esc(s.display_name)}</strong></td>
<td>${esc(prettyDay(s.summary.last_practiced))}</td>
<td>${esc(s.summary.sessions_7d)}</td>
<td>${s.summary.accuracy_7d === null ? '&mdash;' : `${esc(s.summary.accuracy_7d)}%`}</td>
<td>${esc(s.summary.mastered_total)}</td>
<td>${esc(s.summary.struggling_words.join(', ') || '—')}</td>
<td>${esc(s.summary.active_patterns.map(p => p.label).join(', ') || '—')}</td>
<td>${esc(assignmentText(s.summary) || '—')}</td></tr>`).join('');

  const patterns = overview.class_patterns.length
    ? `<ul>${overview.class_patterns.map(p => `<li><strong>${esc(p.label)}</strong>: ${esc(p.students)} students are working on this. A good one to teach to the whole class.</li>`).join('')}</ul>`
    : '<p class="empty">No spelling pattern is shared by three or more students right now.</p>';

  const quiet = students.filter(s => s.summary.sessions_7d === 0);
  const quietLine = quiet.length
    ? `<p style="font-size:13px"><strong>No practice this week:</strong> ${esc(quiet.map(s => s.display_name).join(', '))}</p>`
    : '<p class="empty">Everyone practised this week.</p>';

  const appended = studentReports.map(r => `<div class="student-page">${renderReportBody(r)}</div>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(overview.group.name)} &ndash; Spelling Tutor class report</title>
<style>${REPORT_CSS}${CLASS_CSS}</style></head>
<body><div class="page">
<h1>${esc(overview.group.name)}</h1>
<p class="sub">Spelling Tutor class report &middot; ${esc(students.length)} ${students.length === 1 ? 'student' : 'students'} &middot; created ${esc(today)}</p>
<p class="cover-note">The week means the last 7 days. &ldquo;Letters correct&rdquo; counts the final answer for each letter in each practice visit. Practice done offline is counted on the day it was synced.</p>

<h2>Who needs a look</h2>
${quietLine}

<h2>Patterns shared across the class</h2>
${patterns}

<h2>Students</h2>
<table class="class-table"><thead><tr><th>Student</th><th>Last practised</th><th>Sessions</th><th>Letters correct</th><th>Mastered</th><th>Tricky words</th><th>Patterns</th><th>Assignments</th></tr></thead>
<tbody>${rows || '<tr><td colspan="8">No students yet.</td></tr>'}</tbody></table>
<footer>Made with Spelling Tutor by Good Plus Fast.</footer>
</div>
${appended}
</body></html>`;
}

export function classFileName(overview, ext, suffix = '') {
  const name = overview.group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'class';
  return `spelling-class-${name}${suffix}.${ext}`;
}
