/**
 * Practice-attempt queue.
 *
 * Every "Check" appends per-letter attempts here (localStorage), whether or not
 * the user is logged in. When authenticated the queue is flushed to
 * POST /api/spelling/attempts in chunks. Each attempt carries a client_id, so a
 * retried batch is ignored by the server and scores are never double-counted.
 */
import { apiFetch } from './apiService';

export const QUEUE_KEY = 'spelling_tutor_attempt_queue_v1';
export const MAX_QUEUE = 1000; // anonymous users: drop oldest beyond this
export const CHUNK_SIZE = 400; // server accepts up to 500 per request

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: attempts for this session are simply not persisted
  }
}

export function queueLength() {
  return read().length;
}

/** attempts: [{ word, letter, position, correct (0|1) }] */
export function enqueue(attempts) {
  if (!attempts?.length) return;
  const stamped = attempts.map(a => ({ ...a, client_id: crypto.randomUUID() }));
  write([...read(), ...stamped].slice(-MAX_QUEUE));
  notify();
}

let flushing = false;
const listeners = new Set();

/** Subscribe to queue changes (used by the Progress page for the pending count). */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(queueLength()));
}

/**
 * Send queued attempts. Returns the number acknowledged.
 * Throws AuthError / NetworkError (queue kept) so callers can update sync status.
 * A 400 (rejected payload) drops that chunk so one bad row can't block the queue.
 */
export async function flush({ keepalive = false } = {}) {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const queue = read();
      if (queue.length === 0) break;
      const chunk = queue.slice(0, CHUNK_SIZE);
      const ids = new Set(chunk.map(a => a.client_id));

      try {
        await apiFetch('/api/spelling/attempts', {
          method: 'POST',
          body: { attempts: chunk },
          keepalive
        });
      } catch (err) {
        if (err.status === 400) {
          console.error('Dropping rejected attempts', err);
        } else {
          throw err;
        }
      }

      // Re-read: new attempts may have been queued while the request was in flight
      write(read().filter(a => !ids.has(a.client_id)));
      sent += chunk.length;
      notify();
    }
  } finally {
    flushing = false;
  }
  return sent;
}
