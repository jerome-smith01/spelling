import { describe, it, expect } from 'vitest';
import { mergeLists, reconcile, serverTimeToIso, remoteToLocal } from './syncService';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

const local = (id, over = {}) => ({
  id, name: id.slice(0, 4), wordsRaw: 'a-b', isDefault: 0,
  updatedAt: '2026-01-02T00:00:00.000Z', dirty: false, deleted: false, ...over
});
const remote = (id, over = {}) => ({
  id, name: id.slice(0, 4), words_raw: 'a-b', is_default: 0, updated_at: '2026-01-02 00:00:00', ...over
});

describe('serverTimeToIso', () => {
  it('converts SQLite UTC timestamps to ISO', () => {
    expect(serverTimeToIso('2026-01-02 03:04:05')).toBe('2026-01-02T03:04:05Z');
    expect(serverTimeToIso('2026-01-02T03:04:05Z')).toBe('2026-01-02T03:04:05Z');
  });
});

describe('mergeLists', () => {
  it('adds remote-only lists locally', () => {
    const { lists, toPush, toDelete } = mergeLists([], [remote(A)]);
    expect(lists.map(l => l.id)).toEqual([A]);
    expect(toPush).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it('pushes dirty local-only lists (first login / created offline)', () => {
    const { lists, toPush } = mergeLists([local(A, { dirty: true })], []);
    expect(toPush).toEqual([A]);
    expect(lists).toHaveLength(1);
  });

  it('drops clean local-only lists (deleted on another device)', () => {
    const { lists, toPush } = mergeLists([local(A, { dirty: false })], []);
    expect(lists).toEqual([]);
    expect(toPush).toEqual([]);
  });

  it('newer dirty local edit wins and is pushed', () => {
    const l = local(A, { dirty: true, wordsRaw: 'local', updatedAt: '2026-02-01T00:00:00.000Z' });
    const { lists, toPush } = mergeLists([l], [remote(A, { words_raw: 'remote' })]);
    expect(toPush).toEqual([A]);
    expect(lists[0].wordsRaw).toBe('local');
  });

  it('newer remote edit beats an older dirty local edit', () => {
    const l = local(A, { dirty: true, wordsRaw: 'local', updatedAt: '2026-01-01T00:00:00.000Z' });
    const { lists, toPush } = mergeLists([l], [remote(A, { words_raw: 'remote' })]);
    expect(toPush).toEqual([]);
    expect(lists[0].wordsRaw).toBe('remote');
    expect(lists[0].dirty).toBe(false);
  });

  it('takes remote for clean lists', () => {
    const { lists } = mergeLists([local(A)], [remote(A, { name: 'Renamed' })]);
    expect(lists[0].name).toBe('Renamed');
  });

  it('deletes remotely when a local tombstone exists', () => {
    const { toDelete, lists } = mergeLists([local(A, { deleted: true })], [remote(A)]);
    expect(toDelete).toEqual([A]);
    expect(lists[0].deleted).toBe(true);
  });

  it('drops a tombstone whose remote copy is already gone', () => {
    const { toDelete, lists } = mergeLists([local(A, { deleted: true })], []);
    expect(toDelete).toEqual([]);
    expect(lists).toEqual([]);
  });
});

describe('reconcile', () => {
  it('keeps edits made while the sync was in flight', () => {
    const snapshot = [local(A, { dirty: true })];
    const merged = snapshot;
    const current = [local(A, { dirty: true, wordsRaw: 'edited during sync', updatedAt: '2026-03-01T00:00:00.000Z' })];
    const pushed = new Map([[A, remote(A)]]);
    const out = reconcile(current, snapshot, merged, pushed, new Set());
    expect(out[0].wordsRaw).toBe('edited during sync');
    expect(out[0].dirty).toBe(true);
  });

  it('marks a pushed list clean using the server timestamp', () => {
    const snapshot = [local(A, { dirty: true })];
    const pushed = new Map([[A, remote(A, { updated_at: '2026-04-01 00:00:00' })]]);
    const out = reconcile(snapshot, snapshot, snapshot, pushed, new Set());
    expect(out[0].dirty).toBe(false);
    expect(out[0].updatedAt).toBe('2026-04-01T00:00:00Z');
  });

  it('keeps lists created during the sync', () => {
    const out = reconcile([local(C, { dirty: true })], [], [], new Map(), new Set());
    expect(out.map(l => l.id)).toEqual([C]);
  });

  it('removes tombstones that were deleted remotely', () => {
    const snapshot = [local(A, { deleted: true })];
    const out = reconcile(snapshot, snapshot, snapshot, new Map(), new Set([A]));
    expect(out).toEqual([]);
  });

  it('adds remote-only lists that arrived', () => {
    const merged = [remoteToLocal(remote(B))];
    const out = reconcile([], [], merged, new Map(), new Set());
    expect(out.map(l => l.id)).toEqual([B]);
  });
});
