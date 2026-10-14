import { describe, expect, it } from 'vitest';
import { gradeLabel, renderReportHtml, reportFileName } from './reportHtml';

const report = (over = {}) => ({
  learner: { id: 'k1', name: 'Maya', avatar: '🐼', grade: 2, self: false },
  generated: '2026-10-14',
  period: { from: '2026-09-17', to: '2026-10-14', days: 28 },
  previous: { from: '2026-08-20', to: '2026-09-16' },
  tiles: { sessions: 9, words: 24, accuracy: 84, days_active: 8, mastered: 4, previous: { sessions: 6, words: 24, accuracy: 90, days_active: 5, mastered: 2 } },
  weekly: [{ week_start: '2026-09-17', sessions: 2, accuracy: 80 }, { week_start: '2026-09-24', sessions: 7, accuracy: 88 }],
  hardest: [{ word: 'island', friction: 70, attempts: 18, errors: 7 }],
  mastered_words: [{ word: 'cat', mastered_at: '2026-10-02 10:00:00' }],
  patterns: [{ pattern: 'silent_letters', label: 'Silent letters', status: 'active', misses: 6, summary: 'Leaves out silent letters.', practice_ideas: ['Circle the silent letter.'] }],
  assignments: [{ list_name: 'Week 6', due_at: '2026-10-20', percent: 75 }],
  ...over
});

describe('renderReportHtml', () => {
  it('is a complete, self-contained document: no scripts, no external files', () => {
    const html = renderReportHtml(report());
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(src|href)=["']https?:/i);
    expect(html).not.toMatch(/<link\b/i);
  });

  it('shows the learner, period, tiles, patterns, hardest and mastered words and assignments', () => {
    const html = renderReportHtml(report());
    expect(html).toContain('<h1>Maya</h1>');
    expect(html).toContain('Grade 2');
    expect(html).toContain('Sep 17, 2026 to Oct 14, 2026');
    expect(html).toContain('28 days');
    expect(html).toContain('>84%<');
    expect(html).toContain('Silent letters');
    expect(html).toContain('Circle the silent letter.');
    expect(html).toContain('island');
    expect(html).toMatch(/Week 6<\/td><td>Oct 20, 2026<\/td><td>75%/);
    expect(html).toContain('cat');
    expect(html).toContain('Space for notes');
  });

  it('describes change in words as well as arrows, so it reads in black and white', () => {
    const html = renderReportHtml(report());
    expect(html).toContain('3 more than the previous 28 days');          // sessions 9 vs 6
    expect(html).toContain('6 points fewer than the previous 28 days');  // accuracy 84 vs 90
    expect(html).toContain('same as the previous 28 days');              // words 24 vs 24
  });

  it('draws the weekly chart with an accessible description', () => {
    const html = renderReportHtml(report());
    expect(html).toContain('<svg');
    expect(html).toContain('aria-label="Practice sessions per week: week of 2026-09-17, 2; week of 2026-09-24, 7"');
    expect(html).toContain('9 in total');
  });

  it('copes with an empty period', () => {
    const html = renderReportHtml(report({
      tiles: { sessions: 0, words: 0, accuracy: null, days_active: 0, mastered: 0, previous: { sessions: 0, words: 0, accuracy: null, days_active: 0, mastered: 0 } },
      weekly: [], hardest: [], mastered_words: [], patterns: [], assignments: []
    }));
    expect(html).toContain('n/a');
    expect(html).toContain('No lists have been assigned.');
    expect(html).toContain('No tricky words. Nice work!');
    expect(html).toContain('No patterns need attention right now.');
    expect(html).toContain('No words mastered in this period.');
  });

  it('titles a grown-up\'s own report without a grade', () => {
    const html = renderReportHtml(report({ learner: { id: 'u1', name: '', avatar: null, grade: 3, self: true } }));
    expect(html).toContain('<h1>Your own practice</h1>');
    expect(html).not.toContain('Grade 3');
  });

  it('escapes everything that came from the server', () => {
    const evil = '<img src=x onerror=alert(1)>"\'&';
    const html = renderReportHtml(report({
      learner: { id: 'k1', name: evil, avatar: null, grade: 2, self: false },
      hardest: [{ word: evil, friction: 1, attempts: 1, errors: 1 }],
      mastered_words: [{ word: evil, mastered_at: '2026-10-02 10:00:00' }],
      patterns: [{ pattern: 'p', label: evil, status: 'active', misses: 1, summary: evil, practice_ideas: [evil] }],
      assignments: [{ list_name: evil, due_at: null, percent: 1 }],
      weekly: [{ week_start: evil, sessions: 1, accuracy: null }]
    }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('helpers', () => {
  it('names grades', () => {
    expect(gradeLabel(0)).toBe('Kindergarten');
    expect(gradeLabel(3)).toBe('Grade 3');
  });
  it('builds a safe file name', () => {
    expect(reportFileName(report())).toBe('spelling-report-maya-2026-09-17-to-2026-10-14.html');
    expect(reportFileName(report({ learner: { name: '../Zoë O\'Neil!', self: false } }), 'pdf')).toBe('spelling-report-zo-o-neil-2026-09-17-to-2026-10-14.pdf');
    expect(reportFileName(report({ learner: { name: '', self: true } }))).toMatch(/^spelling-report-me-/);
  });
});
