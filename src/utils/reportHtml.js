/**
 * The learner report as one self-contained HTML document (inline CSS and SVG, no scripts, no
 * network). It is the single source for both exports: the page shows it in a frame and prints it
 * to PDF, and "Download HTML" saves the very same string. Everything from the server is escaped.
 */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GRADE_LABELS = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
export const gradeLabel = (g) => GRADE_LABELS[g] ?? `Grade ${g}`;

const prettyDate = (iso) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? esc(iso)
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
};

/** "▲ 3 more than before" / "▼ …" / "same": words as well as arrows, so it reads in black and white. */
function trend(now, before, unit = '', word = 'the previous period') {
  if (now === null || before === null || now === undefined || before === undefined) return '';
  const diff = now - before;
  if (diff === 0) return `<span class="trend">same as ${word}</span>`;
  const up = diff > 0;
  return `<span class="trend">${up ? '&#9650;' : '&#9660;'} ${Math.abs(diff)}${unit} ${up ? 'more' : 'fewer'} than ${word}</span>`;
}

function tile(label, value, sub) {
  return `<div class="tile"><div class="tile-value">${esc(value)}</div><div class="tile-label">${esc(label)}</div>${sub || ''}</div>`;
}

function weeklyChart(weekly) {
  if (!weekly?.length) return '';
  const max = Math.max(1, ...weekly.map(w => w.sessions));
  const bw = 40, gap = 14, h = 90, pad = 22;
  const width = weekly.length * (bw + gap) + gap;
  const bars = weekly.map((w, i) => {
    const bh = Math.round((w.sessions / max) * h);
    const x = gap + i * (bw + gap);
    return `<rect x="${x}" y="${pad + h - bh}" width="${bw}" height="${bh}" fill="#334155"/>` +
      `<text x="${x + bw / 2}" y="${pad + h - bh - 4}" text-anchor="middle" font-size="11" fill="#0f172a">${w.sessions}</text>` +
      `<text x="${x + bw / 2}" y="${pad + h + 14}" text-anchor="middle" font-size="9" fill="#475569">${esc(w.week_start.slice(5))}</text>`;
  }).join('');
  const total = weekly.reduce((s, w) => s + w.sessions, 0);
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${pad + h + 22}" role="img" aria-label="Practice sessions per week: ${esc(weekly.map(w => `week of ${w.week_start}, ${w.sessions}`).join('; '))}" width="100%" style="max-width:${width * 1.6}px">${bars}</svg>` +
    `<figcaption>Practice sessions per week (${total} in total). Labels show the first day of each week.</figcaption></figure>`;
}

export const REPORT_CSS = `
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;background:#fff;margin:0;padding:24px;line-height:1.45}
.page{max-width:780px;margin:0 auto}
h1{font-size:24px;margin:0 0 2px}
h2{font-size:16px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #0f172a}
.sub{color:#475569;font-size:13px;margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px}
.tile{border:1px solid #94a3b8;border-radius:8px;padding:10px}
.tile-value{font-size:26px;font-weight:800}
.tile-label{font-size:12px;font-weight:700;color:#334155}
.trend{display:block;font-size:11px;color:#475569;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #cbd5e1;vertical-align:top}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569}
ul{margin:4px 0 0;padding-left:18px;font-size:13px}
.tag{display:inline-block;border:1px solid #475569;border-radius:99px;padding:0 8px;font-size:11px;margin-left:6px}
.pattern{margin:0 0 10px;font-size:13px}
.empty{color:#475569;font-size:13px;margin:0}
.notes{height:110px;border:1px solid #94a3b8;border-radius:8px;background:repeating-linear-gradient(#fff,#fff 25px,#cbd5e1 26px)}
.chart{margin:0}.chart figcaption{font-size:11px;color:#475569}
footer{margin-top:24px;font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:8px}
@page{size:auto;margin:14mm}
@media print{body{padding:0}h2,.tile,.pattern,table,.chart{break-inside:avoid}}
`;

/** The inside of one learner's report (everything under <body>), so a class report can stack several. */
export function renderReportBody(report) {
  const { learner, period, previous, tiles, weekly, hardest, mastered_words: mastered, patterns, assignments } = report;
  const who = learner.self ? 'Your own practice' : learner.name;
  const prevWord = `the previous ${period.days} days`;
  const t = tiles;

  const patternHtml = patterns?.length
    ? patterns.map(p => `<div class="pattern"><strong>${esc(p.label)}</strong><span class="tag">${p.status === 'active' ? 'to work on' : 'improved'}</span>` +
        (p.summary ? `<div>${esc(p.summary)}</div>` : '') +
        (p.practice_ideas?.length ? `<ul>${p.practice_ideas.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '') +
        `</div>`).join('')
    : '<p class="empty">No patterns need attention right now.</p>';

  const assignmentHtml = assignments?.length
    ? `<table><thead><tr><th>List</th><th>Due</th><th>Done</th></tr></thead><tbody>${assignments.map(a =>
        `<tr><td>${esc(a.list_name)}</td><td>${a.due_at ? prettyDate(a.due_at) : '&mdash;'}</td><td>${esc(a.percent)}%</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No lists have been assigned.</p>';

  const hardestHtml = hardest?.length
    ? `<table><thead><tr><th>Word</th><th>Letters tried</th><th>Misses</th></tr></thead><tbody>${hardest.map(h =>
        `<tr><td><strong>${esc(h.word)}</strong></td><td>${esc(h.attempts)}</td><td>${esc(h.errors)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No tricky words. Nice work!</p>';

  const masteredHtml = mastered?.length
    ? `<p style="font-size:13px;margin:0">${mastered.map(m => esc(m.word)).join(', ')}</p>`
    : '<p class="empty">No words mastered in this period.</p>';

  return `<div class="page">
<h1>${esc(who)}</h1>
<p class="sub">Spelling Tutor progress report${learner.self ? '' : ` &middot; ${esc(gradeLabel(learner.grade))}`}</p>
<p class="sub">${prettyDate(period.from)} to ${prettyDate(period.to)} (${esc(period.days)} days) &middot; created ${prettyDate(report.generated)}</p>

<div class="tiles">
${tile('Practice sessions', t.sessions, trend(t.sessions, t.previous.sessions, '', prevWord))}
${tile('Days practiced', t.days_active, trend(t.days_active, t.previous.days_active, '', prevWord))}
${tile('Words practiced', t.words, trend(t.words, t.previous.words, '', prevWord))}
${tile('Letters correct', t.accuracy === null ? 'n/a' : `${t.accuracy}%`, trend(t.accuracy, t.previous.accuracy, ' points', prevWord))}
${tile('Words mastered', t.mastered, trend(t.mastered, t.previous.mastered, '', prevWord))}
</div>

<h2>Practice by week</h2>
${weeklyChart(weekly)}

<h2>Assigned lists</h2>
${assignmentHtml}

<h2>Spelling patterns</h2>
${patternHtml}

<h2>Hardest words</h2>
${hardestHtml}

<h2>Newly mastered words</h2>
${masteredHtml}

<h2>Notes</h2>
<div class="notes" aria-label="Space for notes"></div>

<footer>Compared with ${prettyDate(previous.from)} to ${prettyDate(previous.to)}. &ldquo;Letters correct&rdquo; counts the final answer for each letter in each practice visit.
Practice done offline is counted on the day it was synced. Made with Spelling Tutor by Good Plus Fast.</footer>
</div>`;
}

/** The full HTML document for one learner's report (shape: GET /api/spelling/supervisor/report). */
export function renderReportHtml(report) {
  const who = report.learner.self ? 'Your own practice' : report.learner.name;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(who)} &ndash; Spelling Tutor report</title>
<style>${REPORT_CSS}</style></head>
<body>${renderReportBody(report)}</body></html>`;
}

/** A safe file name such as spelling-report-maya-2026-09-17-to-2026-10-14.html */
export function reportFileName(report, ext = 'html') {
  const name = (report.learner.self ? 'me' : report.learner.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learner';
  return `spelling-report-${name}-${report.period.from}-to-${report.period.to}.${ext}`;
}
