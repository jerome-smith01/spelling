// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const fam = vi.hoisted(() => ({
  data: null, calls: {}, verify: null, impl: {}, me: { id: 'u1', email: 'parent@example.com', name: 'Pat' }
}));

vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: () => Promise.resolve(fam.me)
}));
vi.mock('./services/familyApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getFamily: () => Promise.resolve(JSON.parse(JSON.stringify(fam.data))),
  addChild: (v) => { (fam.calls.addChild ||= []).push(v); return fam.impl.addChild ? fam.impl.addChild(v) : Promise.resolve({}); },
  updateChild: (id, v) => { (fam.calls.updateChild ||= []).push([id, v]); return Promise.resolve({}); },
  deleteChild: (id) => { (fam.calls.deleteChild ||= []).push(id); return Promise.resolve(null); },
  verifyPin: (pin) => fam.verify(pin),
  setPin: (pin, cur) => { (fam.calls.setPin ||= []).push([pin, cur]); return Promise.resolve({ pin_set: true }); },
  removePin: (pin) => { (fam.calls.removePin ||= []).push(pin); return Promise.resolve({ pin_set: false }); }
}));

import App from './App';
import { setActiveLearner, getActiveLearner } from './services/activeLearner';

const ME = { id: 'u1', kind: 'self', role: 'self', display_name: '', avatar: null, grade: 3, can_assign: true, can_view_reports: true };
const MAYA = { id: 'kid-maya', kind: 'managed', role: 'owner', display_name: 'Maya', avatar: '🐼', grade: 2, can_assign: true, can_view_reports: true };
const LEO = { id: 'kid-leo', kind: 'managed', role: 'owner', display_name: 'Leo', avatar: '🦊', grade: 1, can_assign: true, can_view_reports: true };

const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const nav = () => screen.findByRole('navigation', { name: 'Main Navigation' });

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  fam.calls = {};
  fam.impl = {};
  fam.verify = async () => ({ ok: true });
  fam.data = { learners: [ME, MAYA, LEO], pin_set: false, max_children: 8, avatars: ['🦊', '🐼'] };
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('kid mode', () => {
  it('shows the children and starts kid mode when one is chosen', async () => {
    const user = userEvent.setup();
    open('/who');
    await user.click(await screen.findByRole('button', { name: /Maya/ }));
    expect(getActiveLearner()).toEqual({ id: 'kid-maya', kid: true });
    // Back on the decks, with practice only: no Progress, Profile or Family tabs, no Log out
    const links = within(await nav()).getAllByRole('link').map(a => a.textContent);
    expect(links).toEqual(['Decks']);
    expect(await screen.findByRole('link', { name: /Maya is practising/ })).toBeInTheDocument();
    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ New deck' })).not.toBeInTheDocument();
  });

  it('sends a child away from grown-up screens', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    for (const path of ['/profile', '/progress', '/family', '/lab']) {
      cleanup();
      open(path);
      expect(await screen.findByRole('heading', { name: 'My decks' })).toBeInTheDocument();
    }
  });

  it('hides deck settings and word import while a child practises', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/lists/default');
    expect(await screen.findByLabelText('Spelling Practice Controls')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Import Words/)).not.toBeInTheDocument();
  });

  it('without a PIN the grown-up tile leaves kid mode straight away', async () => {
    const user = userEvent.setup();
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/who');
    await user.click(await screen.findByRole('button', { name: /Grown-up/ }));
    expect(getActiveLearner()).toEqual({ id: null, kid: false });
    expect(await screen.findByRole('link', { name: 'Progress' })).toBeInTheDocument();
  });

  it('with a PIN: wrong PIN stays locked, the right one lets a grown-up in', async () => {
    const user = userEvent.setup();
    fam.data.pin_set = true;
    fam.verify = async (pin) => {
      if (pin === '1234') return { ok: true };
      const err = new Error('That PIN is not right.');
      err.name = 'ApiError';
      err.status = 403;
      throw err;
    };
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/who');
    await user.click(await screen.findByRole('button', { name: /Grown-up/ }));

    const pin = await screen.findByLabelText('PIN');
    await user.type(pin, '0000');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That PIN is not right.');
    expect(getActiveLearner().kid).toBe(true);

    await user.type(screen.getByLabelText('PIN'), '1234');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(getActiveLearner()).toEqual({ id: null, kid: false }));
  });

  it('switching to a sibling in kid mode also needs the PIN', async () => {
    const user = userEvent.setup();
    fam.data.pin_set = true;
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/who');
    await user.click(await screen.findByRole('button', { name: /Leo/ }));
    expect(getActiveLearner().id).toBe('kid-maya');   // not yet
    await user.type(await screen.findByLabelText('PIN'), '1234');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(getActiveLearner()).toEqual({ id: 'kid-leo', kid: true }));
  });

  it('forgets a child who was deleted elsewhere', async () => {
    setActiveLearner({ id: 'kid-gone', kid: true });
    open('/');
    await waitFor(() => expect(getActiveLearner()).toEqual({ id: null, kid: false }));
  });
});

describe('Family page', () => {
  it('lists the children and starts kid mode with "Practise as"', async () => {
    const user = userEvent.setup();
    open('/family');
    const maya = await screen.findByRole('listitem', { name: 'Child Maya' });
    expect(within(maya).getByText('Grade 2')).toBeInTheDocument();
    await user.click(within(maya).getByRole('button', { name: 'Practise as Maya' }));
    expect(getActiveLearner()).toEqual({ id: 'kid-maya', kid: true });
  });

  it('adds a child with a name, grade and avatar', async () => {
    const user = userEvent.setup();
    open('/family');
    await user.click(await screen.findByRole('button', { name: '+ Add a child' }));
    await user.type(screen.getByLabelText('First name or nickname'), 'Ana');
    await user.selectOptions(screen.getByLabelText('Grade'), '4');
    await user.click(screen.getByRole('button', { name: 'Avatar 🐼' }));
    await user.click(screen.getByRole('button', { name: 'Add child' }));
    await waitFor(() => expect(fam.calls.addChild).toEqual([{ display_name: 'Ana', avatar: '🐼', grade: 4 }]));
  });

  it('shows the server\'s reason when a name is refused', async () => {
    const user = userEvent.setup();
    fam.impl.addChild = () => {
      const err = new Error('Use a first name or nickname only (no emails, links or phone numbers).');
      err.name = 'ApiError';
      err.status = 400;
      return Promise.reject(err);
    };
    open('/family');
    await user.click(await screen.findByRole('button', { name: '+ Add a child' }));
    await user.type(screen.getByLabelText('First name or nickname'), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Add child' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('first name or nickname only');
  });

  it('asks before deleting and explains the 30 days', async () => {
    const user = userEvent.setup();
    open('/family');
    await user.click(await screen.findByRole('button', { name: 'Delete Leo' }));
    expect(await screen.findByText(/deleted for good after 30 days/)).toBeInTheDocument();
    expect(fam.calls.deleteChild).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(fam.calls.deleteChild).toEqual(['kid-leo']));
  });

  it('sets, changes and removes the PIN', async () => {
    const user = userEvent.setup();
    open('/family');
    await user.type(await screen.findByLabelText('PIN'), '2468');
    await user.click(screen.getByRole('button', { name: 'Set PIN' }));
    await waitFor(() => expect(fam.calls.setPin).toEqual([['2468', undefined]]));

    cleanup();
    fam.data.pin_set = true;
    open('/family');
    await user.type(await screen.findByLabelText('Current PIN'), '2468');
    await user.type(screen.getByLabelText('New PIN'), '1357');
    await user.click(screen.getByRole('button', { name: 'Change PIN' }));
    await waitFor(() => expect(fam.calls.setPin[1]).toEqual(['1357', '2468']));
    expect(screen.getByRole('button', { name: 'Remove PIN' })).toBeDisabled();   // the fields were cleared
    await user.type(screen.getByLabelText('Current PIN'), '2468');
    await user.click(screen.getByRole('button', { name: 'Remove PIN' }));
    await waitFor(() => expect(fam.calls.removePin).toEqual(['2468']));
  });
});
