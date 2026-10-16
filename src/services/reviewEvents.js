/**
 * "Took time to review" events: one per completed review popup (see useReviewGate).
 * Queued in localStorage per learner like practice attempts, so nothing is lost offline, and sent
 * to POST /api/spelling/review-events when the server has that endpoint. Until it does (404/405)
 * the queue just keeps the newest MAX_QUEUE events and nothing is shown to the child.
 */
import { apiFetch } from './apiService';
import { getActiveLearnerId } from './activeLearner';

export const REVIEW_QUEUE_KEY = 'spelling_tutor_review_events_v1';
export const MAX_QUEUE = 500;
const CHUNK_SIZE = 50;

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(REVIEW_QUEUE_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const write = (q) => { try { localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(q)); } catch { /* storage unavailable */ } };

/** Events waiting to be sent (for a grown-up view on this device). */
export const readReviewEvents = () => read();

/** event: { context: 'quiz'|'practice', list_id, word, level: 1|2|3, dwell_ms, tries } */
export function recordReviewEvent(event) {
  const learnerId = getActiveLearnerId();
  write([...read(), {
    ...event,
    client_id: crypto.randomUUID(),
    occurred_at: new Date().toISOString(),
    ...(learnerId ? { learner_id: learnerId } : {})
  }].slice(-MAX_QUEUE));
  scheduleFlush();
}

let unavailable = false; // the server has no endpoint yet: stop trying until the page reloads
let timer = null;
let flushing = false;

function scheduleFlush() {
  if (unavailable || timer) return;
  timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, 3000);
}

/** Send queued events, one request per learner. Failures keep the queue. */
export async function flush() {
  if (flushing || unavailable) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const queue = read();
      if (!queue.length) break;
      const learnerId = queue[0].learner_id || null;
      const chunk = queue.filter(e => (e.learner_id || null) === learnerId).slice(0, CHUNK_SIZE);
      const ids = new Set(chunk.map(e => e.client_id));
      try {
        await apiFetch('/api/spelling/review-events', {
          method: 'POST',
          body: { events: chunk.map(({ learner_id, ...e }) => e) }, // eslint-disable-line no-unused-vars
          learner: learnerId
        });
      } catch (err) {
        if (err.status === 404 || err.status === 405 || err.status === 501) { unavailable = true; return sent; }
        if (err.status === 400 || err.status === 403) console.error('Dropping rejected review events', err);
        else throw err;
      }
      write(read().filter(e => !ids.has(e.client_id)));
      sent += chunk.length;
    }
  } finally {
    flushing = false;
  }
  return sent;
}
