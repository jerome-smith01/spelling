// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const h = vi.hoisted(() => ({
  learners: [], calls: {}, preview: null, previewErr: null, access: [], invites: [], watchers: [], me: { id: 'u1', email: 'p@example.com', name: 'Pat' }
}));
const note = (name, ...a) => { (h.calls[name] ||= []).push(a); };
const apiErr = (status, message) => { const e = new Error(message); e.name = 'ApiError'; e.status = status; return e; };

vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: () => (h.me ? Promise.resolve(h.me) : Promise.resolve(null))
}));
vi.mock('./services/familyApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getFamily: () => Promise.resolve({ learners: h.learners, pin_set: false, max_children: 8, avatars: ['🐼'] }),
  getOverview: () => Promise.resolve({ learners: [] }),
  previewInvite: (code) => { note('preview', code); return h.previewErr ? Promise.reject(h.previewErr) : Promise.resolve(h.preview); },
  acceptInvite: (code, name) => { note('accept', code, name); return Promise.resolve({ accepted: true }); },
  createInvite: (body) => { note('createInvite', body); return Promise.resolve({ code: 'ABCD2345', expires_at: '2026-10-21 12:00:00' }); },
  listInvites: () => Promise.resolve(h.invites),
  revokeInvite: (code) => { note('revokeInvite', code); return Promise.resolve(null); },
  getAccess: (id) => Promise.resolve(id === 'u1' ? h.watchers : h.access),
  removeAccess: (id, uid) => { note('removeAccess', id, uid); return Promise.resolve(null); }
}));

import App from './App';
import { setActiveLearner } from './services/activeLearner';
import { inviteSentence } from './pages/JoinPage';

const ME = { id: 'u1', kind: 'self', role: 'self', display_name: '', avatar: null, grade: 3, can_assign: true, can_view_reports: true };
const OWN = { id: 'kid-maya', kind: 'managed', role: 'owner', display_name: 'Maya', avatar: '🐼', grade: 2, can_assign: true, can_view_reports: true };
const SHARED = { id: 'kid-zed', kind: 'managed', role: 'teacher', display_name: 'Zed', avatar: '🦊', grade: 1, can_assign: true, can_view_reports: true };
const STUDENT = { id: 'u9', kind: 'self', role: 'teacher', display_name: 'Sam', avatar: null, grade: 4, can_assign: true, can_view_reports: true };

const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  h.calls = {};
  h.learners = [ME, OWN];
  h.preview = { kind: 'share_child', role: 'teacher', inviter: 'Pat', child_name: 'Maya', can_assign: true, can_view_reports: true, expires_at: '2026-10-21 12:00:00' };
  h.previewErr = null;
  h.access = [];
  h.invites = [];
  h.watchers = [];
  h.me = { id: 'u1', email: 'p@example.com', name: 'Pat' };
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('inviteSentence', () => {
  it('says plainly what a code does', () => {
    expect(inviteSentence({ kind: 'share_child', role: 'teacher', inviter: 'Pat', child_name: 'Maya', can_assign: true, can_view_reports: true }))
      .toBe('Pat wants to share Maya with you as a teacher. You will be able to see progress and reports and assign lists.');
    expect(inviteSentence({ kind: 'link_me', role: 'guardian', inviter: 'p***@example.com', child_name: null, can_assign: false, can_view_reports: true }))
      .toBe('p***@example.com wants to follow your spelling practice as a parent or guardian. They will be able to see progress and reports. You can remove them at any time.');
  });
});

describe('Join page', () => {
  it('checks a typed code, explains it, and accepts it', async () => {
    const user = userEvent.setup();
    open('/join');
    await user.type(await screen.findByLabelText('Code'), 'abcd2345');
    await user.click(screen.getByRole('button', { name: 'Check code' }));
    expect(await screen.findByText(/Pat wants to share Maya with you as a teacher/)).toBeInTheDocument();
    expect(h.calls.preview[0][0]).toBe('ABCD2345');
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(h.calls.accept).toEqual([['ABCD2345', undefined]]));
    expect(await screen.findByRole('heading', { name: 'Family' })).toBeInTheDocument();   // lands on the family page
  });

  it('a link with the code in it checks it straight away; a link-me code can take a nickname', async () => {
    const user = userEvent.setup();
    h.preview = { kind: 'link_me', role: 'teacher', inviter: 'Pat', child_name: null, can_assign: true, can_view_reports: true, expires_at: 'x' };
    open('/join/ABCD2345');
    expect(await screen.findByText(/Pat wants to follow your spelling practice as a teacher/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Your first name and last initial/), 'Sam');
    await user.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(h.calls.accept).toEqual([['ABCD2345', 'Sam']]));
  });

  it('shows the reason when a code does not work and accepts nothing', async () => {
    const user = userEvent.setup();
    h.previewErr = apiErr(404, 'That code did not work. It may have been used or expired.');
    open('/join');
    await user.type(await screen.findByLabelText('Code'), 'WRONG234');
    await user.click(screen.getByRole('button', { name: 'Check code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That code did not work');
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(h.calls.accept).toBeUndefined();
  });

  it('asks a signed-out visitor to log in first, and is closed to a child in kid mode', async () => {
    h.me = null;
    open('/join/ABCD2345');
    expect(await screen.findByText(/Log in first/)).toBeInTheDocument();
    cleanup();
    h.me = { id: 'u1', email: 'p@example.com', name: 'Pat' };
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/join');
    expect(await screen.findByRole('heading', { name: 'My decks' })).toBeInTheDocument();
  });
});

describe('Family page: shared children and students', () => {
  it('a shared child and a linked student can be followed but not practised as, edited or deleted', async () => {
    h.learners = [ME, OWN, SHARED, STUDENT];
    open('/family');
    const zed = await screen.findByRole('listitem', { name: 'Child Zed' });
    expect(within(zed).getByText('Shared with you')).toBeInTheDocument();
    expect(within(zed).queryByRole('button', { name: /Practise as/ })).not.toBeInTheDocument();
    expect(within(zed).queryByRole('button', { name: /Edit|Delete|Share/ })).not.toBeInTheDocument();
    expect(within(zed).getByRole('button', { name: "See Zed's progress" })).toBeInTheDocument();
    const sam = screen.getByRole('listitem', { name: 'Child Sam' });
    expect(within(sam).getByText('Student')).toBeInTheDocument();
    expect(within(sam).queryByRole('button', { name: /Practise as/ })).not.toBeInTheDocument();
    // The child you added keeps everything
    const maya = screen.getByRole('listitem', { name: 'Child Maya' });
    expect(within(maya).getByRole('button', { name: 'Practise as Maya' })).toBeInTheDocument();
    expect(within(maya).getByRole('button', { name: 'Share Maya' })).toBeInTheDocument();
  });

  it('"Who is practising" offers only children you can practise as', async () => {
    const user = userEvent.setup();
    h.learners = [ME, OWN, SHARED, STUDENT];
    open('/who');
    expect(await screen.findByRole('button', { name: /Maya/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Zed/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sam/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Maya/ }));   // sanity: the real child still works
  });

  it('shares a child: makes a code, shows who can already see them, and removes someone', async () => {
    const user = userEvent.setup();
    h.access = [{ user_id: 'uB', label: 't***@example.com', role: 'teacher', can_assign: true, can_view_reports: true }];
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Share Maya' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByLabelText('Can see: t***@example.com')).toHaveTextContent('Teacher');
    await user.selectOptions(within(dialog).getByLabelText('They are a'), 'teacher');
    await user.click(within(dialog).getByRole('button', { name: 'Make a code' }));
    expect(await within(dialog).findByText('ABCD2345')).toBeInTheDocument();
    expect(h.calls.createInvite).toEqual([[{ kind: 'share_child', learner_id: 'kid-maya', role: 'teacher' }]]);
    await user.click(within(dialog).getByRole('button', { name: 'Remove t***@example.com' }));
    await waitFor(() => expect(h.calls.removeAccess).toEqual([['kid-maya', 'uB']]));
  });

  it('makes a code for a student to link their own account', async () => {
    const user = userEvent.setup();
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Make a code for a student' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Make a code' }));
    expect(await within(dialog).findByText('ABCD2345')).toBeInTheDocument();
    expect(h.calls.createInvite).toEqual([[{ kind: 'link_me', role: 'teacher' }]]);
  });

  it('lists codes still waiting and cancels one', async () => {
    const user = userEvent.setup();
    h.invites = [{ code: 'KKKK2222', kind: 'share_child', role: 'teacher', learner_id: 'kid-maya', child_name: 'Maya', expires_at: 'x' }];
    open('/family');
    const row = await screen.findByLabelText('Waiting code KKKK2222');
    expect(row).toHaveTextContent('shares Maya');
    await user.click(within(row).getByRole('button', { name: 'Cancel code KKKK2222' }));
    await waitFor(() => expect(h.calls.revokeInvite).toEqual([['KKKK2222']]));
  });

  it('a student sees which grown-ups can see their practice and can remove one', async () => {
    const user = userEvent.setup();
    h.watchers = [{ user_id: 'uT', label: 'Teresa', role: 'teacher', can_assign: true, can_view_reports: true }];
    open('/family');
    const row = await screen.findByLabelText('Can see your practice: Teresa');
    await user.click(within(row).getByRole('button', { name: 'Stop Teresa seeing my practice' }));
    await waitFor(() => expect(h.calls.removeAccess).toEqual([['u1', 'uT']]));
  });
});
