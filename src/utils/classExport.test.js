import { describe, expect, it } from 'vitest';
import { CSV_HEADER, attentionOf, classCsv, classFileName, renderClassReportHtml, visibleStudents } from './classExport';

const sum = (over = {}) => ({
  last_practiced: '2026-10-12 16:00:00', sessions_7d: 3, days_active_7d: 2, words_7d: 9, accuracy_7d: 84, mastered_total: 12, mastered_7d: 1,
  struggling_count: 1, struggling_words: ['island'], active_patterns: [{ pattern: 'silent_letters', label: 'Silent letters' }], assignments: [], ...over
});
const student = (name, over = {}) => ({ id: `id-${name}`, display_name: name, avatar: '🐼', grade: 3, summary: sum(over) });
const overview = (students, patterns = []) => ({
  group: { id: 'g1', name: 'Room 12', created_at: '2026-10-01 00:00:00', join_code: null },
  students, class_patterns: patterns, as_of: '2026-10-14T12:00:00Z'
});

describe('visibleStudents', () => {
  const list = [
    student('Cy', { sessions_7d: 0, struggling_count: 0, accuracy_7d: null, last_practiced: null }),
    student('Ava', { sessions_7d: 5, accuracy_7d: 95, struggling_count: 0 }),
    student('Bo', { sessions_7d: 1, accuracy_7d: 40, struggling_count: 3, last_practiced: '2026-10-14 08:00:00' })
  ];
  it('sorts by name by default and by the chosen column', () => {
    expect(visibleStudents([...list]).map(s => s.display_name)).toEqual(['Ava', 'Bo', 'Cy']);
    expect(visibleStudents([...list], 'all', 'sessions').map(s => s.display_name)).toEqual(['Ava', 'Bo', 'Cy']);
    expect(visibleStudents([...list], 'all', 'accuracy').map(s => s.display_name)).toEqual(['Bo', 'Ava', 'Cy']);   // lowest first; no data last
    expect(visibleStudents([...list], 'all', 'last').map(s => s.display_name)).toEqual(['Bo', 'Ava', 'Cy']);       // most recent first
    expect(visibleStudents([...list], 'all', 'tricky').map(s => s.display_name)).toEqual(['Bo', 'Ava', 'Cy']);
  });
  it('filters to who needs a look', () => {
    expect(visibleStudents([...list], 'quiet').map(s => s.display_name)).toEqual(['Cy']);
    expect(visibleStudents([...list], 'tricky').map(s => s.display_name)).toEqual(['Bo']);
    expect(visibleStudents([...list], 'nonsense').length).toBe(3);
  });
  it('says why a student needs a look', () => {
    expect(attentionOf(sum({ sessions_7d: 0, struggling_count: 2 }))).toEqual(['No practice this week', '2 tricky words']);
    expect(attentionOf(sum({ struggling_count: 0 }))).toEqual([]);
  });
});

describe('classCsv', () => {
  it('has a header and one row per student, following the filter and sort', () => {
    const o = overview([student('Bo', { sessions_7d: 0 }), student('Ava')]);
    const lines = classCsv(o).trim().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(lines[1].startsWith('Ava,2026-10-12,3,2,84,12,island,Silent letters,')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(classCsv(o, { filter: 'quiet' }).trim().split('\r\n').map(l => l.split(',')[0])).toEqual(['Student', 'Bo']);
  });
  it('quotes commas and quotes, and defuses spreadsheet formulas', () => {
    const o = overview([student('=HYPERLINK("x")'), student('Smith, Ann'), student('+1 555'), student('@cmd')]);
    const csv = classCsv(o);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"Smith, Ann"');
    expect(csv).toContain("'+1 555");
    expect(csv).toContain("'@cmd");
    expect(csv).not.toMatch(/(^|\n)[=+@]/);
  });
  it('lists assignments with their completion', () => {
    const o = overview([student('Ava', { assignments: [{ list_name: 'Week 6', percent: 75, complete: false }, { list_name: 'Week 5', percent: 100, complete: true }] })]);
    expect(classCsv(o)).toContain('Week 6: 75%; Week 5: done');
  });
});

describe('renderClassReportHtml', () => {
  it('is self-contained and shows the table, who has not practiced, and shared patterns', () => {
    const html = renderClassReportHtml(
      overview([student('Ava'), student('Bo', { sessions_7d: 0, last_practiced: null })], [{ pattern: 'silent_letters', label: 'Silent letters', students: 4 }]),
      { today: '2026-10-14' }
    );
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toMatch(/<script|<link\b|(src|href)=["']https?:/i);
    expect(html).toContain('<h1>Room 12</h1>');
    expect(html).toContain('2 students');
    expect(html).toContain('<strong>No practice this week:</strong> Bo');
    expect(html).toContain('Silent letters</strong>: 4 students');
    expect(html).toContain('<strong>Ava</strong>');
    expect(html).toContain('Oct 12');
    expect(html).toContain('Not yet');
  });
  it('escapes names, patterns and class name', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const html = renderClassReportHtml({ ...overview([student(evil)], [{ pattern: 'p', label: evil, students: 3 }]), group: { id: 'g', name: evil, created_at: '', join_code: null } });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
  it('appends one full student report per page after the class table', () => {
    const report = (name) => ({
      learner: { id: name, name, avatar: null, grade: 2, self: false }, generated: '2026-10-14',
      period: { from: '2026-09-17', to: '2026-10-14', days: 28 }, previous: { from: '2026-08-20', to: '2026-09-16' },
      tiles: { sessions: 1, words: 1, accuracy: 80, days_active: 1, mastered: 0, previous: { sessions: 0, words: 0, accuracy: null, days_active: 0, mastered: 0 } },
      weekly: [], hardest: [], mastered_words: [], patterns: [], assignments: []
    });
    const html = renderClassReportHtml(overview([student('Ava'), student('Bo')]), { studentReports: [report('Ava'), report('Bo')] });
    expect((html.match(/class="student-page"/g) || [])).toHaveLength(2);
    expect(html.indexOf('<h1>Room 12</h1>')).toBeLessThan(html.indexOf('<h1>Ava</h1>'));
    expect(html.indexOf('<h1>Ava</h1>')).toBeLessThan(html.indexOf('<h1>Bo</h1>'));
    expect(html).toContain('.student-page{break-before:page');
  });
  it('copes with an empty class', () => {
    const html = renderClassReportHtml(overview([]));
    expect(html).toContain('No students yet.');
    expect(html).toContain('Everyone practiced this week.');
  });
});

describe('classFileName', () => {
  it('is safe', () => {
    expect(classFileName(overview([]), 'csv')).toBe('spelling-class-room-12.csv');
    expect(classFileName({ group: { name: '../Mr. O\'Neil’s class!' } }, 'html', '-with-students')).toBe('spelling-class-mr-o-neil-s-class-with-students.html');
  });
});
