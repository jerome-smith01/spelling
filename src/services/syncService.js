/**
 * Word-list sync (local-first, last-write-wins per list).
 *
 * mergeLists / reconcile are pure so they can be unit-tested; syncLists does the
 * network calls around them.
 */
import { apiFetch } from './apiService';

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) -> ISO string. */
export function serverTimeToIso(value) {
  if (!value) return new Date().toISOString();
  if (value.includes('T')) return value;
  return `${value.replace(' ', 'T')}Z`;
}

export function remoteToLocal(r) {
  return {
    id: r.id,
    name: r.name,
    wordsRaw: r.words_raw,
    isDefault: r.is_default ? 1 : 0,
    updatedAt: serverTimeToIso(r.updated_at),
    dirty: false,
    deleted: false
  };
}

const newer = (a, b) => new Date(a).getTime() > new Date(b).getTime();

/**
 * Decide what to do with each list.
 * Returns { lists (merged view), toPush: ids, toDelete: ids }.
 *
 * Rules:
 *  - remote-only            -> add locally
 *  - local tombstone        -> delete remotely
 *  - both, local dirty+newer-> push local; otherwise remote wins
 *  - local-only & dirty     -> push (first login / created offline)
 *  - local-only & clean     -> it was deleted elsewhere: drop it locally
 */
export function mergeLists(local, remote) {
  const remoteById = new Map(remote.map(r => [r.id, remoteToLocal(r)]));
  const merged = [];
  const toPush = [];
  const toDelete = [];

  for (const l of local) {
    const r = remoteById.get(l.id);
    remoteById.delete(l.id);

    if (l.deleted) {
      if (r) {
        toDelete.push(l.id);
        merged.push(l);
      }
      continue; // tombstone with nothing remote: drop
    }

    if (!r) {
      if (l.dirty) {
        toPush.push(l.id);
        merged.push(l);
      }
      continue;
    }

    if (l.dirty && newer(l.updatedAt, r.updatedAt)) {
      toPush.push(l.id);
      merged.push(l);
    } else {
      merged.push(r);
    }
  }

  for (const r of remoteById.values()) merged.push(r);
  return { lists: merged, toPush, toDelete };
}

/**
 * Fold a finished sync back into the *current* local state, which may have been
 * edited while the network calls were in flight.
 *  - snapshot: lists as they were when the sync started
 *  - merged:   mergeLists().lists
 *  - pushed:   Map(id -> server list) for successful pushes
 *  - deleted:  Set(ids) successfully deleted remotely
 */
export function reconcile(current, snapshot, merged, pushed, deleted) {
  const snapById = new Map(snapshot.map(l => [l.id, l]));
  const mergedById = new Map(merged.map(l => [l.id, l]));
  const out = [];

  for (const c of current) {
    const snap = snapById.get(c.id);
    const editedDuringSync = snap && c.updatedAt !== snap.updatedAt;
    if (editedDuringSync || (c.deleted && !snap)) {
      out.push(c); // newer local change: keep, still dirty
      continue;
    }
    if (c.deleted && deleted.has(c.id)) continue; // tombstone fully processed
    const m = mergedById.get(c.id);
    if (!m) {
      // Not in merged: dropped by the merge (deleted elsewhere / empty tombstone)
      if (!snap) out.push(c); // created during the sync
      continue;
    }
    const server = pushed.get(c.id);
    out.push(server ? { ...remoteToLocal(server) } : m);
    mergedById.delete(c.id);
  }

  // Remote-only lists that arrived in this sync
  for (const m of mergedById.values()) {
    if (!current.some(c => c.id === m.id) && !m.deleted) out.push(m);
  }
  return out;
}

const toBody = (l) => ({ name: l.name, words_raw: l.wordsRaw, is_default: l.isDefault ? 1 : 0 });

/**
 * Pull remote lists, merge, push local changes.
 * Returns { snapshot, merged, pushed, deleted, errors }. Throws AuthError /
 * NetworkError from the initial fetch so the caller can update sync status.
 */
export async function syncLists(snapshot) {
  const remote = await apiFetch('/api/spelling/lists');
  const { lists: merged, toPush, toDelete } = mergeLists(snapshot, remote ?? []);

  const pushed = new Map();
  const deleted = new Set();
  const errors = [];

  for (const id of toPush) {
    const l = merged.find(x => x.id === id);
    try {
      const server = await apiFetch(`/api/spelling/lists/${id}`, { method: 'PUT', body: toBody(l) });
      pushed.set(id, server);
    } catch (err) {
      if (err.name === 'AuthError' || err.name === 'NetworkError') throw err;
      errors.push({ id, error: err }); // e.g. 409 list limit, 400 too large
    }
  }

  for (const id of toDelete) {
    try {
      await apiFetch(`/api/spelling/lists/${id}`, { method: 'DELETE' });
      deleted.add(id);
    } catch (err) {
      if (err.status === 404) deleted.add(id);
      else if (err.name === 'AuthError' || err.name === 'NetworkError') throw err;
      else errors.push({ id, error: err });
    }
  }

  return { snapshot, merged, pushed, deleted, errors };
}
