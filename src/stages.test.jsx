// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const h = vi.hoisted(() => ({
  assigned: [], pushes: [], fetches: [], remote: {}, pushErr: false, scores: [], patternCalls: 0, digestCalls: 0
}));

vi.mock('./services/apiService', async (importOriginal) => ({
  ...(await importOriginal()),
  getMe: () => Promise.resolve({ id: 'u1', email: 'p@example.com', name: 'Pat' })
}));
vi.mock('./services/familyApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getFamily: () => Promise.resolve({
    learners: [
      { id: 'u1', kind: 'self', role: 'self', display_name: '', avatar: null, grade: 3, can_assign: true, can_view_reports: true, group_ids: [] },
      { id: 'kid-maya', kind: 'managed', role: 'owner', display_name: 'Maya', avatar: '🐼', grade: 2, can_assign: true, can_view_reports: true, group_ids: [] }
    ], pin_set: false, max_children: 8, avatars: ['🐼']
  }),
  getAssignedLists: () => Promise.resolve(h.assigned)
}));
vi.mock('./services/progressSync', () => ({
  fetchStages: (id) => { h.fetches.push(id); return Promise.resolve({ words: h.remote }); },
  pushStages: (id, words) => { h.pushes.push([id, words]); return h.pushErr ? Promise.reject(new Error('offline')) : Promise.resolve({ saved: 1 }); }
}));
vi.mock('./services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getScores: () => Promise.resolve(h.scores),
  getPatterns: () => { h.patternCalls++; return Promise.resolve([]); },
  getLatestDigest: () => { h.digestCalls++; return Promise.resolve(null); },
  getDigestPrefs: () => Promise.resolve({ email_opt_in: false })
}));

import App from './App';
import { useDeckSchedule } from './hooks/useDeckSchedule';
import { setActiveLearner } from './services/activeLearner';

const LIST = '33333333-3333-4333-8333-333333333333';
const ASSIGNED = {
  assignment_id: 'as1', list_id: LIST, list_name: 'Week 6 words', due_at: null, created_at: '2026-10-10 10:00:00',
  total: 2, practised: 0, done: 0, percent: 0, complete: false, words_raw: 'cat\ndog', focus_groups: [], hints: []
};
const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: 'kid-maya', kid: true });
  // New words start at level 2 here (1 in 2 letters visible, typed); level 1 is the pick-the-letters exercise
  localStorage.setItem('spelling_tutor_deck_prefs_v1:Lkid-maya', JSON.stringify({ startLevel: 2, levelScheme: 2 }));
  Object.assign(h, { assigned: [ASSIGNED], pushes: [], fetches: [], remote: {}, pushErr: false, scores: [], patternCalls: 0, digestCalls: 0 });
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); setActiveLearner({ id: null }); vi.restoreAllMocks(); });

const fill = async (user, letters) => {
  const boxes = screen.getAllByLabelText(/Letter \d of word/);
  for (let i = 0; i < boxes.length; i++) await user.type(boxes[i], letters[i]);
};

describe('stages of an assigned list', () => {
  it('opening the list only reads the server: nothing is sent back until something changes on this device', async () => {
    h.remote = { cat: { level: 5, mastered: true }, dog: { level: 3, mastered: false } };
    open(`/lists/${LIST}`);
    await screen.findByLabelText('Spelling Practice Controls');
    await waitFor(() => expect(h.fetches).toEqual([LIST]));
    await new Promise(r => setTimeout(r, 1900));
    expect(h.pushes).toEqual([]);                   // a stale device must not overwrite newer progress
  });

  it('practicing reports the new stage (after a short pause), and carries the server\'s words along', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);   // cards come in list order: cat first
    const user = userEvent.setup();
    h.remote = { dog: { level: 5, mastered: true } };   // finished on another device: not due here
    open(`/lists/${LIST}`);
    await screen.findByLabelText('Spelling card for cat');
    await waitFor(() => expect(h.fetches).toEqual([LIST]));
    await fill(user, ['a']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for cat/ }));
    await waitFor(() => expect(h.pushes.length).toBeGreaterThan(0), { timeout: 4000 });
    const [id, words] = h.pushes.at(-1);
    expect(id).toBe(LIST);
    expect(words.cat).toEqual({ level: 3, mastered: false });   // passed stage 2 at 100%
    expect(words.dog).toEqual({ level: 5, mastered: true });    // started from the server
  });

  it('a miss reports the lower stage: progress can go down', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    h.remote = { cat: { level: 3, mastered: false } };
    localStorage.setItem(`spelling_tutor_deck_progress_v1:${LIST}:Lkid-maya`, JSON.stringify({
      testDate: null, levelScheme: 2, words: { cat: { level: 3, mastered: false, due: '2000-01-01', lastScore: 100, advancedOn: null, attempts: 2 } }
    }));
    open(`/lists/${LIST}`);
    await screen.findByLabelText('Spelling card for cat');
    // level 3 hides more letters: type a wrong letter into every box
    const boxes = screen.getAllByLabelText(/Letter \d of word/);
    for (const b of boxes) await user.type(b, 'z');
    await user.click(screen.getByRole('button', { name: /Check your spelling for cat/ }));
    await waitFor(() => expect(h.pushes.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(h.pushes.at(-1)[1].cat).toEqual({ level: 2, mastered: false });
  });

  it('an offline push is quietly retried on the next change, not shown as an error', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const user = userEvent.setup();
    h.pushErr = true;
    open(`/lists/${LIST}`);
    await screen.findByLabelText('Spelling card for cat');
    await fill(user, ['a']);
    await user.click(screen.getByRole('button', { name: /Check your spelling for cat/ }));
    await waitFor(() => expect(h.pushes.length).toBeGreaterThan(0), { timeout: 4000 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('a list that is not assigned to whoever is practicing is never reported', async () => {
    h.assigned = [];
    setActiveLearner({ id: null });   // a child cannot open an unassigned list at all (see familyMode.test.jsx)
    localStorage.setItem('spelling_tutor_lists_v5', JSON.stringify([{ id: LIST, name: 'Mine', wordsRaw: 'cat\ndog', isDefault: 0, updatedAt: 'x', dirty: true, deleted: false, focusGroups: [], hints: [] }]));
    open(`/lists/${LIST}`);
    await screen.findByLabelText('Spelling Practice Controls');
    await new Promise(r => setTimeout(r, 1900));
    expect(h.fetches).toEqual([]);
    expect(h.pushes).toEqual([]);
  });
});

describe('strict stages', () => {
  const wrapper = ({ children }) => children;
  it('an assigned list is passed at 100% whatever threshold is saved', () => {
    localStorage.setItem('spelling_tutor_deck_prefs_v1', JSON.stringify({ advancePct: 60, dropPct: 40, startLevel: 1, levelScheme: 2 }));
    setActiveLearner({ id: null });
    const lenient = renderHook(() => useDeckSchedule('l1', ['cat'], { strict: false }), { wrapper });
    act(() => { lenient.result.current.commit('cat', 80); });
    expect(lenient.result.current.stateFor('cat').attempts).toBe(1);
    expect(lenient.result.current.prefs.advancePct).toBe(60);
    const strict = renderHook(() => useDeckSchedule('l2', ['cat'], { strict: true }), { wrapper });
    const r = (() => { let out; act(() => { out = strict.result.current.commit('cat', 80); }); return out; })();
    expect(strict.result.current.prefs.advancePct).toBe(100);
    expect(r.outcome).toBe('stay');
    expect(strict.result.current.stateFor('cat').level).toBe(1);
  });

  it('mergeRemote starts words this device has not practiced and leaves the ones it has', () => {
    setActiveLearner({ id: null });
    const { result } = renderHook(() => useDeckSchedule('l3', ['cat', 'dog', 'sun'], { strict: true }));
    act(() => { result.current.commit('dog', 100); });
    expect(result.current.stateFor('dog').level).toBe(2);
    let changed;
    act(() => { changed = result.current.mergeRemote({ cat: { level: 5, mastered: true }, dog: { level: 4, mastered: false }, sun: { level: 3, mastered: false } }); });
    expect(changed).toBe(true);
    expect(result.current.stateFor('cat')).toMatchObject({ level: 5, mastered: true });
    expect(result.current.stateFor('dog').level).toBe(2);       // this device's own stage stands, even though the server is ahead
    expect(result.current.stateFor('sun').level).toBe(3);
    expect(result.current.queue).toContain('sun');
    expect(result.current.queue).not.toContain('cat');           // mastered and not due
    act(() => { changed = result.current.mergeRemote({ cat: { level: 5, mastered: true } }); });
    expect(changed).toBe(false);                                // nothing new
  });
});

describe('a child sees their progress, but not reports', () => {
  const SCORES = [{ word: 'loving', attempt_count: 20, error_count: 15, friction_score: 90, perfect_streak: 0, mastered_at: null, last_practiced: '2026-09-20 12:00:00' }];

  it('shows the words and numbers, and asks for no weekly summary, email setting or pattern reports', async () => {
    h.scores = SCORES;
    open('/progress');
    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();
    expect((await screen.findAllByRole('link', { name: 'loving' })).length).toBeGreaterThan(0);
    expect(screen.getByText('Words practiced')).toBeInTheDocument();
    expect(screen.queryByText(/weekly/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Read report|report/i })).not.toBeInTheDocument();
    expect(h.patternCalls).toBe(0);
    expect(h.digestCalls).toBe(0);
  });

  it('a grown-up looking at the same page still gets the reports', async () => {
    setActiveLearner({ id: null });
    h.scores = SCORES;
    open('/progress');
    await screen.findAllByRole('link', { name: 'loving' });
    await waitFor(() => expect(h.patternCalls).toBeGreaterThan(0));
    expect(h.digestCalls).toBeGreaterThan(0);
  });
});
