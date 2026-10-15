// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { dueText } from './utils/dueText';

const h = vi.hoisted(() => ({ assigned: [], overview: null, calls: {}, assignImpl: null, lists: [] }));

vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: () => Promise.resolve({ id: 'u1', email: 'parent@example.com', name: 'Pat' })
}));
vi.mock('./services/familyApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getFamily: () => Promise.resolve({
    learners: [
      { id: 'u1', kind: 'self', role: 'self', display_name: '', avatar: null, grade: 3, can_assign: true, can_view_reports: true },
      { id: 'kid-maya', kind: 'managed', role: 'owner', display_name: 'Maya', avatar: '🐼', grade: 2, can_assign: true, can_view_reports: true },
      { id: 'kid-leo', kind: 'managed', role: 'owner', display_name: 'Leo', avatar: '🦊', grade: 1, can_assign: true, can_view_reports: true }
    ],
    pin_set: false, max_children: 8, avatars: ['🐼']
  }),
  getOverview: () => h.overview(),
  getAssignedLists: () => (h.assigned === null ? Promise.reject(new Error('offline')) : Promise.resolve(h.assigned)),
  assignList: (v) => { (h.calls.assignList ||= []).push(v); return h.assignImpl ? h.assignImpl(v) : Promise.resolve({ assigned: v.learner_ids.length }); },
  removeAssignment: (id) => { (h.calls.removeAssignment ||= []).push(id); return Promise.resolve(null); }
}));

import App from './App';
import { setActiveLearner } from './services/activeLearner';
import { LISTS_KEY } from './services/storageService';

const ASSIGNED = {
  assignment_id: 'as1', list_id: '33333333-3333-4333-8333-333333333333', list_name: 'Week 6 words', due_at: '2099-01-01',
  created_at: '2026-10-10 10:00:00', total: 2, practised: 1, done: 1, percent: 50, complete: false,
  words_raw: 'cat\ndog', focus_groups: [], hints: []
};
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  h.assigned = [ASSIGNED];
  h.calls = {};
  h.assignImpl = null;
  h.overview = () => Promise.resolve({ learners: [
    { id: 'kid-maya', summary: { last_practiced: null, sessions_7d: 0, days_active_7d: 0, words_7d: 0, accuracy_7d: null, mastered_total: 0, mastered_7d: 0, struggling_count: 0, active_patterns: [],
      assignments: [{ assignment_id: 'as1', list_id: 'l1', list_name: 'Week 6 words', due_at: '2099-01-01', percent: 50, complete: false }] } },
    { id: 'kid-leo', summary: { last_practiced: null, sessions_7d: 0, days_active_7d: 0, words_7d: 0, accuracy_7d: null, mastered_total: 0, mastered_7d: 0, struggling_count: 0, active_patterns: [], assignments: [] } }
  ] });
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const saveLists = (lists, remote = lists.filter(l => !l.dirty)) => {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  // What the account holds: GET returns the synced lists; saving the unsynced one fails, so it stays unsynced
  globalThis.fetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith('/api/spelling/lists') && (!init || init.method === undefined || init.method === 'GET')) {
      return new Response(JSON.stringify(remote.map(l => ({
        id: l.id, name: l.name, words_raw: l.wordsRaw, is_default: 0, focus_groups: null, hints: null,
        created_at: '2026-10-01 00:00:00', updated_at: '2026-10-01 00:00:00'
      }))), { status: 200 });
    }
    if (init?.method === 'PUT') return new Response(JSON.stringify({ error: 'down' }), { status: 500 });
    return new Response('[]', { status: 200 });
  });
};
const LIST = (over) => ({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Week 7', wordsRaw: 'sun\nhat', isDefault: 0, updatedAt: '2026-10-01T00:00:00Z', dirty: false, deleted: false, focusGroups: [], hints: [], ...over });

describe('assigned lists for the learner', () => {
  it('shows an Assigned row with progress and a due date, even for a list the learner does not own', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/');
    const card = await screen.findByRole('listitem', { name: 'Assigned Week 6 words' });
    expect(within(card).getByText('50% done')).toBeInTheDocument();
    expect(within(card).getByText(/^Due /)).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Assignment progress' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('heading', { name: 'Assigned to Maya' })).toBeInTheDocument();
  });

  it('opens the assigned list to practice, read-only: no settings or import', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    open(`/lists/${ASSIGNED.list_id}`);
    expect(await screen.findByLabelText('Spelling Practice Controls')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Week 6 words' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument();
  });

  it('a grown-up practicing on their own account also gets read-only settings for an assigned list', async () => {
    open(`/lists/${ASSIGNED.list_id}`);   // not kid mode: e.g. a student with their own login
    expect(await screen.findByRole('heading', { name: 'Week 6 words' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument();
  });

  it('shows Done and no Assigned row when there is nothing assigned', async () => {
    h.assigned = [{ ...ASSIGNED, percent: 100, complete: true }];
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/');
    expect(await screen.findByText('Done ✓')).toBeInTheDocument();
    cleanup();
    h.assigned = [];
    setActiveLearner({ id: null });
    open('/');
    await screen.findByRole('heading', { name: 'My decks' });
    expect(screen.queryByRole('heading', { name: /Assigned to/ })).not.toBeInTheDocument();
  });

  it('keeps the last assignments when offline', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/');
    await screen.findByRole('listitem', { name: 'Assigned Week 6 words' });
    cleanup();
    h.assigned = null;   // the next fetch fails
    open('/');
    expect(await screen.findByRole('listitem', { name: 'Assigned Week 6 words' })).toBeInTheDocument();
  });
});

describe('Assigning from the Family page', () => {
  it('assigns a saved list to the chosen children with a due date', async () => {
    const user = userEvent.setup();
    saveLists([LIST(), LIST({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Unsynced', dirty: true })]);
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Assign a list to Maya' }));
    const dialog = await screen.findByRole('dialog');
    // The unsynced list cannot be assigned yet, and the child it was opened from is ticked
    expect(within(dialog).getByRole('option', { name: 'Week 7' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('option', { name: 'Unsynced' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /Maya/ })).toBeChecked();
    await user.click(within(dialog).getByRole('checkbox', { name: /Leo/ }));
    await user.type(within(dialog).getByLabelText('Due date (optional)'), '2026-10-20');
    await user.click(within(dialog).getByRole('button', { name: 'Assign' }));
    await waitFor(() => expect(h.calls.assignList).toEqual([
      { list_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', learner_ids: ['kid-maya', 'kid-leo'], due_at: '2026-10-20' }
    ]));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('explains when the list has not reached the account yet', async () => {
    const user = userEvent.setup();
    saveLists([LIST()]);
    h.assignImpl = () => { const e = new Error('Not found'); e.name = 'ApiError'; e.status = 404; return Promise.reject(e); };
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Assign a list to Maya' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Assign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not saved to your account yet');
  });

  it('says so when there is nothing to assign', async () => {
    const user = userEvent.setup();
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Assign a list to Maya' }));
    expect(await screen.findByText(/no saved lists to assign yet/)).toBeInTheDocument();
  });

  it('shows each child\'s assignments with progress, and removes one', async () => {
    const user = userEvent.setup();
    open('/family');
    const maya = await screen.findByRole('listitem', { name: 'Child Maya' });
    const row = await within(maya).findByLabelText('Assignment Week 6 words');
    expect(row).toHaveTextContent('50% done');
    await user.click(within(row).getByRole('button', { name: 'Remove assignment Week 6 words' }));
    await waitFor(() => expect(h.calls.removeAssignment).toEqual(['as1']));
  });
});

describe('dueText', () => {
  const now = new Date(2026, 9, 14, 15, 0);
  it('speaks plainly', () => {
    expect(dueText(null, now)).toEqual({ text: 'No due date', late: false });
    expect(dueText('2026-10-14', now)).toEqual({ text: 'Due today', late: false });
    expect(dueText('2026-10-20', now)).toEqual({ text: 'Due Oct 20', late: false });
    expect(dueText('2026-10-12', now)).toEqual({ text: 'Overdue (Oct 12)', late: true });
    expect(dueText('nope', now)).toEqual({ text: 'No due date', late: false });
  });
});
