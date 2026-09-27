/**
 * Client-side friction score for anonymous users (their attempts stay in the
 * localStorage queue). Mirrors the server scoring in
 * apps/spelling-tutor-api/src/lib/scoring.ts. Keep the two in sync.
 *
 * Final answer only: within a session (one visit to a list) only the last answer
 * for each letter position counts. Three perfect sessions in a row master a word
 * and wipe its earlier history.
 */
export const FLAME_THRESHOLD = 40;
export const MASTERY_STREAK = 3;

/** Collapse chronological attempts to one final answer per (session, word, position). */
export function toFinalAnswers(attempts) {
  const last = new Map();
  attempts.forEach((a, order) => {
    const sessionKey = a.session_id ?? `solo:${a.client_id ?? order}`;
    last.set(`${sessionKey}|${a.word}|${a.position}`, {
      order, sessionKey, word: a.word, position: a.position, correct: a.correct === 1
    });
  });
  return [...last.values()].sort((x, y) => x.order - y.order);
}

function frictionOf(finals) {
  const byPosition = new Map();
  for (const f of finals) {
    if (!byPosition.has(f.position)) byPosition.set(f.position, []);
    byPosition.get(f.position).push(f.correct);
  }
  let total = 0;
  for (const results of byPosition.values()) {
    let consecutive = 0;
    for (let i = results.length - 1; i >= 0; i--) {
      if (!results[i]) { consecutive++; total += 10 * consecutive; }
      else { consecutive = 0; total -= 5; }
    }
  }
  return Math.max(0, total);
}

/** Friction for one word's chronological attempts. */
export function wordFriction(attempts, word) {
  const needed = Math.min(3, word.length);
  const sessions = new Map(); // insertion order = chronological
  for (const f of toFinalAnswers(attempts)) {
    if (!sessions.has(f.sessionKey)) sessions.set(f.sessionKey, []);
    sessions.get(f.sessionKey).push(f);
  }

  let kept = [];
  let streak = 0;
  for (const s of sessions.values()) {
    kept = kept.concat(s);
    const perfect = s.length >= needed && s.every(f => f.correct);
    streak = perfect ? streak + 1 : 0;
    if (streak >= MASTERY_STREAK) { kept = []; streak = 0; } // mastered: earlier history no longer counts
  }
  return frictionOf(kept);
}

/** { word: friction } for every word in the queue. */
export function frictionByWord(queue) {
  const byWord = new Map();
  for (const a of queue) {
    if (!byWord.has(a.word)) byWord.set(a.word, []);
    byWord.get(a.word).push(a);
  }
  const out = {};
  for (const [word, attempts] of byWord) out[word] = wordFriction(attempts, word);
  return out;
}
