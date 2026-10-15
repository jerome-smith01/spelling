/**
 * Practice-attempt queue.
 *
 * Every "Check" appends per-letter attempts here (localStorage), whether or not
 * the user is logged in. When authenticated the queue is flushed to
 * POST /api/spelling/attempts in chunks. Each attempt carries a client_id, so a
 * retried batch is ignored by the server and scores are never double-counted.
 *
 * Family accounts: each attempt is stamped with the learner who practiced (`learner_id`,
 * absent = the user themselves). A flush sends one request per learner, naming that
 * learner in a header, so a child's practice can never land on a sibling or the parent.
 */
import { apiFetch } from './apiService';
import { getActiveLearnerId } from './activeLearner';

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

/** Pending attempts, oldest first (used for anonymous flames). */
export function readQueue() {
  return read();
}

const learnerOf = (a) => a.learner_id || null;

export function queueLength() {
  return read().length;
}

/** attempts: [{ word, letter, position, correct (0|1), typed?, session_id?, list_id? }] */
export function enqueue(attempts) {
  if (!attempts?.length) return;
  const learnerId = getActiveLearnerId();
  const stamped = attempts.map(a => ({
    ...a,
    client_id: crypto.randomUUID(),
    ...(learnerId ? { learner_id: learnerId } : {})
  }));
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
      // One request holds one learner's attempts: take the oldest's, in order
      const learnerId = learnerOf(queue[0]);
      const chunk = queue.filter(a => learnerOf(a) === learnerId).slice(0, CHUNK_SIZE);
      const ids = new Set(chunk.map(a => a.client_id));

      try {
        await apiFetch('/api/spelling/attempts', {
          method: 'POST',
          body: { attempts: chunk.map(({ learner_id, ...a }) => a) }, // eslint-disable-line no-unused-vars
          learner: learnerId,
          keepalive
        });
      } catch (err) {
        if (err.status === 400) {
          console.error('Dropping rejected attempts', err);
        } else if ((err.status === 404 || err.status === 403) && learnerId) {
          // The child profile was deleted, this account was unlinked, or it may look but not practice
          // (a teacher viewing a student): these can never be saved, and must not block the queue
          console.error('Dropping attempts the server will not accept for this learner', err);
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
