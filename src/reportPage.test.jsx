// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

const h = vi.hoisted(() => ({ calls: [], impl: null, overview: null }));

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
      { id: 'kid-zed', kind: 'managed', role: 'guardian', display_name: 'Zed', avatar: '🦊', grade: 1, can_assign: false, can_view_reports: false }
    ],
    pin_set: false, max_children: 8, avatars: ['🐼']
  }),
  getOverview: () => h.overview(),
  getReport: (id, range) => { h.calls.push([id, range]); return h.impl(id, range); }
}));

import App from './App';
import { setActiveLearner, getActiveLearner } from './services/activeLearner';
import { lastPracticedText } from './pages/FamilyPage';

const REPORT = {
  learner: { id: 'kid-maya', name: 'Maya', avatar: '🐼', grade: 2, self: false },
  generated: '2026-10-14', period: { from: '2026-09-17', to: '2026-10-14', days: 28 }, previous: { from: '2026-08-20', to: '2026-09-16' },
  tiles: { sessions: 9, words: 24, accuracy: 84, days_active: 8, mastered: 4, previous: { sessions: 6, words: 18, accuracy: 80, days_active: 5, mastered: 2 } },
  weekly: [{ week_start: '2026-09-17', sessions: 2, accuracy: 80 }], hardest: [], mastered_words: [], patterns: [], assignments: []
};
const SUMMARY = { last_practiced: '2026-10-12 16:20:00', sessions_7d: 3, days_active_7d: 3, words_7d: 9, accuracy_7d: 84, mastered_total: 12, mastered_7d: 2, struggling_count: 1, active_patterns: [{ pattern: 'silent_letters', label: 'Silent letters' }] };

const open = (path) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  h.calls = [];
  h.impl = () => Promise.resolve(REPORT);
  h.overview = () => Promise.resolve({ learners: [{ id: 'kid-maya', summary: SUMMARY }] });
  window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('[]', { status: 200 }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Report page', () => {
  it('shows the report in a frame and loads the last 4 weeks by default', async () => {
    open('/family/kid-maya/report');
    const frame = await screen.findByTitle('Progress report for Maya');
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Maya</h1>');
    expect(frame.getAttribute('sandbox')).not.toMatch(/allow-scripts/);
    expect(h.calls[0][0]).toBe('kid-maya');
    const { from, to } = h.calls[0][1];
    expect((new Date(to) - new Date(from)) / 86_400_000).toBe(27);   // 28 days inclusive
  });

  it('downloads the same report as an HTML file', async () => {
    const user = userEvent.setup();
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:report'; });
    URL.revokeObjectURL = vi.fn();
    const names = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { names.push(this.download); });
    open('/family/kid-maya/report');
    await screen.findByTitle('Progress report for Maya');
    await user.click(screen.getByRole('button', { name: 'Download HTML' }));
    expect(click).toHaveBeenCalled();
    expect(names).toEqual(['spelling-report-maya-2026-09-17-to-2026-10-14.html']);
    expect(blobs[0].type).toBe('text/html;charset=utf-8');
    const text = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(blobs[0]); });
    expect(text).toBe(screen.getByTitle('Progress report for Maya').getAttribute('srcdoc'));
  });

  it('opens the print dialog for the PDF', async () => {
    const user = userEvent.setup();
    open('/family/kid-maya/report');
    const frame = await screen.findByTitle('Progress report for Maya');
    const print = vi.fn();
    Object.defineProperty(frame, 'contentWindow', { value: { focus() {}, print }, configurable: true });
    await user.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('reloads for another period', async () => {
    const user = userEvent.setup();
    open('/family/kid-maya/report');
    await screen.findByTitle('Progress report for Maya');
    await user.selectOptions(screen.getByLabelText('Period'), '84');
    await waitFor(() => expect(h.calls.length).toBe(2));
    const { from, to } = h.calls[1][1];
    expect((new Date(to) - new Date(from)) / 86_400_000).toBe(83);
  });

  it('says so when the report is not found, and offers no downloads', async () => {
    h.impl = () => { const e = new Error('Not found'); e.name = 'ApiError'; e.status = 404; return Promise.reject(e); };
    open('/family/nobody/report');
    expect(await screen.findByRole('alert')).toHaveTextContent('could not find that report');
    expect(screen.getByRole('button', { name: 'Download HTML' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
  });

  it('is closed to a child in kid mode', async () => {
    setActiveLearner({ id: 'kid-maya', kid: true });
    open('/family/kid-maya/report');
    expect(await screen.findByRole('heading', { name: 'My decks' })).toBeInTheDocument();
    expect(h.calls).toHaveLength(0);
  });
});

describe('Family overview', () => {
  it('shows this week for each child and links to progress and the report', async () => {
    const user = userEvent.setup();
    open('/family');
    const maya = await screen.findByRole('listitem', { name: 'Child Maya' });
    expect(await screen.findByText(/3 sessions on 3 days this week · 84% of letters correct/)).toBeInTheDocument();
    expect(screen.getByText(/12 words mastered \(2 this week\) · 1 tricky word/)).toBeInTheDocument();
    expect(screen.getByText('To work on: Silent letters')).toBeInTheDocument();
    expect(maya.querySelector('a[href="/family/kid-maya/report"]')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: "See Maya's progress" }));
    expect(getActiveLearner()).toEqual({ id: 'kid-maya', kid: false });   // a grown-up looking, not kid mode
    expect(await screen.findByText('Maya', { selector: 'strong' })).toBeInTheDocument();   // the banner
  });

  it('a child shared without report permission shows no numbers, progress or report', async () => {
    open('/family');
    const zed = await screen.findByRole('listitem', { name: 'Child Zed' });
    expect(zed.querySelector('.child-summary')).toBeNull();
    expect(zed.querySelector('a[href$="/report"]')).toBeNull();
    expect(zed.textContent).not.toMatch(/Progress/);
  });

  it('still lists the children when the numbers cannot load', async () => {
    h.overview = () => Promise.reject(new Error('offline'));
    open('/family');
    expect(await screen.findByRole('listitem', { name: 'Child Maya' })).toBeInTheDocument();
    expect(document.querySelector('.child-summary')).toBeNull();
  });
});

describe('lastPracticedText', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  it('speaks in days', () => {
    expect(lastPracticedText(null, now)).toBe('Has not practised yet');
    expect(lastPracticedText('2026-10-14 01:00:00', now)).toBe('Last practised today');
    expect(lastPracticedText('2026-10-13 23:00:00', now)).toBe('Last practised yesterday');
    expect(lastPracticedText('2026-10-09 10:00:00', now)).toBe('Last practised 5 days ago');
    expect(lastPracticedText('garbage', now)).toBe('Has not practised yet');
  });
});
