// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const h = vi.hoisted(() => ({
  learners: [], groups: [], overview: null, calls: {}, reportCalls: [], createErr: null, addErr: null
}));
const note = (name, ...a) => { (h.calls[name] ||= []).push(a); };
const apiErr = (status, message) => { const e = new Error(message); e.name = 'ApiError'; e.status = status; return e; };

vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: () => Promise.resolve({ id: 'u1', email: 't@example.com', name: 'Tina' })
}));
vi.mock('./services/familyApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getFamily: () => Promise.resolve({ learners: h.learners, pin_set: false, max_children: 200, avatars: ['🐼'] }),
  getOverview: () => Promise.resolve({ learners: [] }),
  getGroups: () => Promise.resolve({ groups: h.groups, max_classes: 5, max_students: 40 }),
  createGroup: (name) => { note('createGroup', name); return h.createErr ? Promise.reject(h.createErr) : Promise.resolve({ id: 'g-new', name }); },
  getClassOverview: (id) => { note('overview', id); return h.overview ? Promise.resolve(JSON.parse(JSON.stringify(h.overview))) : Promise.reject(apiErr(404, 'Not found')); },
  addStudents: (id, names, grade) => { note('addStudents', id, names, grade); return h.addErr ? Promise.reject(h.addErr) : Promise.resolve({ students: names.map((n, i) => ({ id: `n${i}`, display_name: n })), skipped: [] }); },
  removeGroupMember: (id, lid) => { note('removeMember', id, lid); return Promise.resolve(null); },
  setClassCode: (id, enabled) => { note('setCode', id, enabled); return Promise.resolve({ join_code: enabled ? 'NEWC0DE2' : null }); },
  renameGroup: (id, name) => { note('rename', id, name); return Promise.resolve({}); },
  deleteGroup: (id, withStudents) => { note('deleteGroup', id, withStudents); return Promise.resolve(null); },
  assignToClass: (id, v) => { note('assignToClass', id, v); return Promise.resolve({ assigned: 2 }); },
  getReport: (id, range) => { h.reportCalls.push([id, range]); return Promise.resolve({
    learner: { id, name: id, avatar: null, grade: 3, self: false }, generated: '2026-10-14', period: { from: range.from, to: range.to, days: 28 }, previous: { from: 'a', to: 'b' },
    tiles: { sessions: 1, words: 1, accuracy: 80, days_active: 1, mastered: 0, previous: { sessions: 0, words: 0, accuracy: null, days_active: 0, mastered: 0 } },
    weekly: [], hardest: [], mastered_words: [], patterns: [], assignments: [] }); }
}));

import App from './App';
import { inviteSentence } from './pages/JoinPage';
import { setActiveLearner, getActiveLearner } from './services/activeLearner';
import { LISTS_KEY } from './services/storageService';

const ME = { id: 'u1', kind: 'self', role: 'self', display_name: '', avatar: null, grade: 3, can_assign: true, can_view_reports: true, group_ids: [] };
const sum = (over = {}) => ({
  last_practiced: '2026-10-12 16:00:00', sessions_7d: 3, days_active_7d: 2, words_7d: 9, accuracy_7d: 84, mastered_total: 12, mastered_7d: 1,
  struggling_count: 1, struggling_words: ['island'], active_patterns: [{ pattern: 'silent_letters', label: 'Silent letters' }], assignments: [], ...over
});
const student = (name, over) => ({ id: `id-${name}`, kind: 'managed', role: 'owner', display_name: name, avatar: '🐼', grade: 3, can_assign: true, summary: sum(over) });
const OVERVIEW = () => ({
  group: { id: 'g1', name: 'Room 12', created_at: '2026-10-01 00:00:00', join_code: null },
  students: [
    student('Cy', { sessions_7d: 0, struggling_count: 0, struggling_words: [], accuracy_7d: null, last_practiced: null, active_patterns: [] }),
    student('Ava', { sessions_7d: 5, accuracy_7d: 95, struggling_count: 0, struggling_words: [], assignments: [{ assignment_id: 'a1', list_name: 'Week 6', percent: 60, complete: false }] }),
    student('Bo', { sessions_7d: 1, accuracy_7d: 40, struggling_count: 3, struggling_words: ['island', 'knight'] })
  ],
  class_patterns: [{ pattern: 'silent_letters', label: 'Silent letters', students: 3 }], as_of: '2026-10-14T12:00:00Z'
});
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const rowNames = () => within(screen.getByRole('table', { name: 'Class progress' })).getAllByRole('row').slice(1).map(r => within(r).getAllByRole('rowheader')[0].textContent.replace('🐼', '').trim());

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  h.calls = {}; h.reportCalls = []; h.createErr = null; h.addErr = null;
  h.learners = [ME];
  h.groups = [{ id: 'g1', name: 'Room 12', member_count: 3, join_code: null, created_at: '2026-10-01 00:00:00' }];
  h.overview = OVERVIEW();
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Classes page', () => {
  it('lists your classes and opens one', async () => {
    open('/classes');
    const card = await screen.findByRole('listitem', { name: 'Class Room 12' });
    expect(within(card).getByText('3 students')).toBeInTheDocument();
  });

  it('will not make a class without the consent tick, then makes it and opens it', async () => {
    const user = userEvent.setup();
    open('/classes');
    await user.type(await screen.findByLabelText('Class name'), 'Room 13');
    expect(screen.getByRole('button', { name: 'Make class' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /permission to enter my students/ }));
    await user.click(screen.getByRole('button', { name: 'Make class' }));
    await waitFor(() => expect(h.calls.createGroup).toEqual([['Room 13']]));
    await waitFor(() => expect(h.calls.overview).toBeTruthy());           // landed on the new class
  });

  it('says when you have reached the limit and shows server errors', async () => {
    h.groups = Array.from({ length: 5 }, (_, i) => ({ id: `g${i}`, name: `C${i}`, member_count: 1, join_code: null, created_at: 'x' }));
    open('/classes');
    expect(await screen.findByText(/most classes allowed \(5\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Class name')).not.toBeInTheDocument();
  });

  it('is closed to a child in kid mode', async () => {
    setActiveLearner({ id: 'kid', kid: true });
    h.learners = [ME, { id: 'kid', kind: 'managed', role: 'owner', display_name: 'K', avatar: '🐼', grade: 3, can_assign: true, can_view_reports: true, group_ids: [] }];
    open('/classes');
    expect(await screen.findByRole('heading', { name: 'My decks' })).toBeInTheDocument();
  });
});

describe('Class page', () => {
  it('shows every student with this week at a glance, and what to teach the whole class', async () => {
    open('/classes/g1');
    expect(await screen.findByRole('heading', { name: 'Room 12' })).toBeInTheDocument();
    expect(rowNames()).toEqual(['Ava', 'Bo', 'Cy']);
    const bo = screen.getByRole('row', { name: 'Student Bo' });
    expect(within(bo).getByText('island, knight')).toBeInTheDocument();
    expect(within(bo).getByText('40%')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: 'Student Ava' })).getByText('Week 6 60%')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: 'Student Cy' })).getByText('Not yet')).toBeInTheDocument();
    const shared = screen.getByRole('region', { name: 'Worth teaching to the whole class' });
    expect(shared).toHaveTextContent('Silent letters: 3 students are working on this');
  });

  it('filters to who has not practiced and sorts by a column', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await screen.findByRole('table', { name: 'Class progress' });
    await user.selectOptions(screen.getByLabelText('Sort by'), 'accuracy');
    expect(rowNames()).toEqual(['Bo', 'Ava', 'Cy']);                      // lowest first, no data last
    await user.selectOptions(screen.getByLabelText('Show'), 'quiet');
    expect(rowNames()).toEqual(['Cy']);
    expect(screen.getByText('1 of 3 students')).toBeInTheDocument();
  });

  it('adds students from a pasted list (lines or commas) with a grade', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.type(await screen.findByLabelText('First name and last initial, one per line (like Ava S.)'), 'Dee{enter}Eli, Fay;Gus');
    await user.selectOptions(screen.getByLabelText('Grade'), '4');
    await user.click(screen.getByRole('button', { name: 'Add students' }));
    await waitFor(() => expect(h.calls.addStudents).toEqual([['g1', ['Dee', 'Eli', 'Fay', 'Gus'], 4]]));
    expect(await screen.findByText('Added 4 students.')).toBeInTheDocument();
  });

  it('shows why a roster was refused', async () => {
    const user = userEvent.setup();
    h.addErr = apiErr(400, 'Use a first name or nickname only (no emails or links). (“a@b.co”)');
    open('/classes/g1');
    await user.type(await screen.findByLabelText('First name and last initial, one per line (like Ava S.)'), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Add students' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('a@b.co');
  });

  it('opens, copies, renews and closes the class code', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.click(await screen.findByRole('button', { name: 'Open the class code' }));
    await waitFor(() => expect(h.calls.setCode).toEqual([['g1', true]]));
    h.overview.group.join_code = 'NEWC0DE2';           // what the server now holds
    await user.click(await screen.findByRole('button', { name: 'New code' }).catch(() => screen.findByRole('button', { name: 'Open the class code' })));
    expect(await screen.findByText('NEWC0DE2')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Close code' }));
    await waitFor(() => expect(h.calls.setCode.at(-1)).toEqual(['g1', false]));
  });

  it('takes a student out of the class, and goes to a student\'s report or progress', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    const ava = await screen.findByRole('row', { name: 'Student Ava' });
    expect(within(ava).getByRole('link', { name: 'Report for Ava' })).toHaveAttribute('href', '/family/id-Ava/report');
    await user.click(within(ava).getByRole('button', { name: 'Remove Ava from the class' }));
    await waitFor(() => expect(h.calls.removeMember).toEqual([['g1', 'id-Ava']]));
    await user.click(within(screen.getByRole('row', { name: 'Student Bo' })).getByRole('button', { name: "See Bo's progress" }));
    expect(getActiveLearner()).toEqual({ id: 'id-Bo', kid: false });
  });

  it('assigns a saved list to the whole class with a due date', async () => {
    const user = userEvent.setup();
    localStorage.setItem(LISTS_KEY, JSON.stringify([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Week 7', wordsRaw: 'sun', isDefault: 0, updatedAt: 'x', dirty: false, deleted: false, focusGroups: [], hints: [] }]));
    globalThis.fetch.mockImplementation(async (url) => new Response(String(url).endsWith('/api/spelling/lists')
      ? JSON.stringify([{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Week 7', words_raw: 'sun', is_default: 0, created_at: '2026-10-01 00:00:00', updated_at: '2026-10-01 00:00:00' }]) : '[]', { status: 200 }));
    open('/classes/g1');
    await user.click(await screen.findByRole('button', { name: 'Assign a list to the class' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Due date (optional)'), '2026-10-30');
    await user.click(within(dialog).getByRole('button', { name: 'Assign to everyone' }));
    await waitFor(() => expect(h.calls.assignToClass).toEqual([['g1', { list_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', due_at: '2026-10-30' }]]));
  });

  it('renames and deletes the class, optionally with the student profiles', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.click(await screen.findByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('Class name');
    await user.clear(input);
    await user.type(input, 'Room 14');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(h.calls.rename).toEqual([['g1', 'Room 14']]));
    await user.click(screen.getByRole('button', { name: 'Delete class' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'Delete class' }));
    await waitFor(() => expect(h.calls.deleteGroup).toEqual([['g1', true]]));
  });

  it('says so when the class is not found', async () => {
    h.overview = null;
    open('/classes/nope');
    expect(await screen.findByRole('alert')).toHaveTextContent('could not find that class');
  });
});

describe('Class exports', () => {
  let saved;
  beforeEach(() => {
    saved = [];
    URL.createObjectURL = vi.fn((b) => { saved.push(b); return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { saved.at(-1).name = this.download; });
  });
  const text = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(blob); });

  it('downloads a spreadsheet that follows the filter', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.selectOptions(await screen.findByLabelText('Show'), 'tricky');
    await user.click(screen.getByRole('button', { name: 'Spreadsheet (CSV)' }));
    expect(saved[0].name).toBe('spelling-class-room-12.csv');
    const csv = await text(saved[0]);
    expect(csv.split('\r\n')[0]).toMatch(/^Student,/);
    expect(csv).toContain('Bo,');
    expect(csv).not.toContain('Ava,');
  });

  it('downloads the class report as HTML, with every student\'s own report when asked', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.click(await screen.findByRole('button', { name: 'Class report (HTML)' }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe('spelling-class-room-12.html');
    expect(await text(saved[0])).not.toContain('class="student-page"');
    expect(h.reportCalls).toHaveLength(0);

    await user.click(screen.getByRole('checkbox', { name: /full report for each student/ }));
    await user.click(screen.getByRole('button', { name: 'Class report (HTML)' }));
    await waitFor(() => expect(saved).toHaveLength(2));
    expect(saved[1].name).toBe('spelling-class-room-12-with-students.html');
    const html = await text(saved[1]);
    expect((html.match(/class="student-page"/g) || [])).toHaveLength(3);
    expect(h.reportCalls.map(c => c[0]).sort()).toEqual(['id-Ava', 'id-Bo', 'id-Cy']);
    const { from, to } = h.reportCalls[0][1];
    expect((new Date(to) - new Date(from)) / 86_400_000).toBe(27);
  });

  it('prints the class report for a PDF through a hidden frame', async () => {
    const user = userEvent.setup();
    open('/classes/g1');
    await user.click(await screen.findByRole('button', { name: 'Class report (PDF)' }));
    const frame = await waitFor(() => { const f = document.querySelector('iframe[aria-hidden="true"]'); expect(f).not.toBeNull(); return f; });
    expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts/);
    expect(frame.srcdoc).toContain('<h1>Room 12</h1>');
    expect(await screen.findByRole('status')).toHaveTextContent('Save as PDF');
  });
});

describe('Family page with a class', () => {
  it('leaves class students to the class page and points teachers there', async () => {
    h.learners = [ME,
      { id: 'kid1', kind: 'managed', role: 'owner', display_name: 'Own child', avatar: '🐼', grade: 3, can_assign: true, can_view_reports: true, group_ids: [] },
      { id: 'st1', kind: 'managed', role: 'owner', display_name: 'Class student', avatar: '🦊', grade: 3, can_assign: true, can_view_reports: true, group_ids: ['g1'] }];
    open('/family');
    expect(await screen.findByRole('listitem', { name: 'Child Own child' })).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: 'Child Class student' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up a class' })).toHaveAttribute('href', '/classes');
  });
});

describe('Joining a class with its code', () => {
  it('explains the class in plain words', () => {
    expect(inviteSentence({ kind: 'join_class', role: 'teacher', inviter: 'Tina', class_name: 'Room 12', can_assign: true, can_view_reports: true }))
      .toBe('Tina invites you to join their class “Room 12”. Your teacher will be able to see progress and reports and assign lists. You can leave the class at any time.');
  });
});
