// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';

// Plain functions (not vi.fn) so rejected promises are not tracked by the spy
const h = vi.hoisted(() => ({
  auth: { isLoggedIn: true },
  scores: () => Promise.resolve([]),
  scoreCalls: 0,
  queue: [],
  listeners: new Set()
}));

vi.mock('./useAuth', () => ({ useAuth: () => h.auth }));
vi.mock('../services/coachingApi', () => ({
  getScores: () => { h.scoreCalls++; return h.scores(); }
}));
vi.mock('../services/attemptQueue', () => ({
  readQueue: () => h.queue,
  subscribe: (fn) => { h.listeners.add(fn); return () => h.listeners.delete(fn); }
}));

import { useStruggle } from './useStruggle';

const notify = () => act(() => { h.listeners.forEach((fn) => fn(h.queue.length)); });
const miss = (word, position, session, id) => ({ word, position, correct: 0, session_id: session, client_id: id });

beforeEach(() => {
  h.auth = { isLoggedIn: true };
  h.scores = () => Promise.resolve([]);
  h.scoreCalls = 0;
  h.queue = [];
  h.listeners.clear();
});
afterEach(cleanup);

describe('useStruggle (anonymous)', () => {
  beforeEach(() => { h.auth = { isLoggedIn: false }; });

  it('computes friction locally from the queued attempts and never calls the API', () => {
    h.queue = [miss('loving', 3, 's1', 'a'), miss('loving', 3, 's2', 'b'), miss('loving', 3, 's3', 'c')];
    const { result } = renderHook(() => useStruggle());
    expect(result.current).toEqual({ loving: 60 });
    expect(h.scoreCalls).toBe(0);
  });

  it('updates when new attempts are queued', () => {
    const { result } = renderHook(() => useStruggle());
    expect(result.current).toEqual({});
    h.queue = [miss('cat', 1, 's1', 'a')];
    notify();
    expect(result.current).toEqual({ cat: 10 });
  });

  it('stops listening when unmounted', () => {
    const { unmount } = renderHook(() => useStruggle());
    expect(h.listeners.size).toBe(1);
    unmount();
    expect(h.listeners.size).toBe(0);
  });
});

describe('useStruggle (logged in)', () => {
  it('loads the server scores as a word to friction map', async () => {
    h.scores = () => Promise.resolve([{ word: 'loving', friction_score: 90 }, { word: 'cat', friction_score: 0 }]);
    const { result } = renderHook(() => useStruggle());
    await waitFor(() => expect(result.current).toEqual({ loving: 90, cat: 0 }));
  });

  it('refetches when the attempt queue drains after a flush, but not while attempts are still pending', async () => {
    const { result } = renderHook(() => useStruggle());
    await waitFor(() => expect(h.scoreCalls).toBe(1));

    h.queue = [miss('cat', 1, 's1', 'a')];
    await notify();
    expect(h.scoreCalls).toBe(1);                       // still pending: server scores are stale, do not refetch

    h.scores = () => Promise.resolve([{ word: 'cat', friction_score: 55 }]);
    h.queue = [];
    await notify();                                       // flushed: queue is empty
    await waitFor(() => expect(result.current).toEqual({ cat: 55 }));
    expect(h.scoreCalls).toBe(2);
  });

  it('keeps the last known scores when a refresh fails (offline or expired)', async () => {
    h.scores = () => Promise.resolve([{ word: 'loving', friction_score: 90 }]);
    const { result } = renderHook(() => useStruggle());
    await waitFor(() => expect(result.current).toEqual({ loving: 90 }));

    h.scores = () => Promise.reject(new Error('offline'));
    h.queue = [];
    await notify();
    await waitFor(() => expect(h.scoreCalls).toBe(2));
    expect(result.current).toEqual({ loving: 90 });
  });

  it('ignores a non-array response instead of crashing', async () => {
    h.scores = () => Promise.resolve({ error: 'weird' });
    const { result } = renderHook(() => useStruggle());
    await waitFor(() => expect(h.scoreCalls).toBe(1));
    expect(result.current).toEqual({});
  });
});
