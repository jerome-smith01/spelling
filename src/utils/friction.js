/**
 * Client-side friction score for anonymous users (their attempts stay in the
 * localStorage queue). Mirrors the server scoring in
 * apps/spelling-tutor-api/src/lib/scoring.ts. Keep the two in sync.
 *
 * Session answers: a session (one visit to a list) can't end until every word is
 * right, so the last answer says nothing. Instead each (session, word, position)
 * counts how many times that letter was missed during the visit. Three sessions in
 * a row with no misses master a word and wipe its earlier history.
 */
export const FLAME_THRESHOLD = 40;
export const MASTERY_STREAK = 3;

/**
 * Collapse chronological attempts to one answer per (session, word, position):
 * `misses` = wrong answers for that letter in the session, `correct` = never missed.
 */
export function toSessionAnswers(attempts) {
  const byKey = new Map();
  attempts.forEach((a, order) => {
    const sessionKey = a.session_id ?? `solo:${a.client_id ?? order}`;
    const key = `${sessionKey}|${a.word}|${a.position}`;
    if (!byKey.has(key)) byKey.set(key, { order, sessionKey, word: a.word, position: a.position, misses: 0 });
    if (a.correct !== 1) byKey.get(key).misses++;
  });
  return [...byKey.values()].map(x => ({ ...x, correct: x.misses === 0 }));
}

/**
 * Per letter: a session with m misses adds 10 × m² (so the same letter missed twice
 * is a flame), a session with none subtracts 5. Letters are summed, floor 0.
 */
function frictionOf(answers) {
  let total = 0;
  for (const a of answers) total += a.misses > 0 ? 10 * a.misses * a.misses : -5;
  return Math.max(0, total);
}

/** Friction for one word's chronological attempts. */
export function wordFriction(attempts, word) {
  const needed = Math.min(3, word.length);
  const sessions = new Map(); // insertion order = chronological
  for (const f of toSessionAnswers(attempts)) {
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
