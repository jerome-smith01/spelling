/**
 * DEV ONLY: a fake, logged-in API for checking layouts on localhost without the
 * Astro site or the spelling worker. Enabled only by `npm run dev:mock`
 * (vite --mode mock); never part of a build. Data lives in memory and resets on
 * restart. AI answers are canned: this is for layout, not for testing the AI.
 */
const USER = { id: 'mock-user', email: 'mock.parent@example.com', name: 'Mock Parent' };
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const lists = new Map([
  ['11111111-1111-4111-8111-111111111111', {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'U1W5 – Diphthongs: ou/ow, oi/oy',
    words_raw: 'thou-sand\nshow-er\ncoin\nboy\nfoun-tain\nen-joy\npoint\ncloud\ncrowd\nloy-al',
    is_default: 0,
    focus_groups: '["ou","ow","oi","oy"]',
    hints: '["oy and ow usually end a word; oi and ou go in the middle"]',
    created_at: now(),
    updated_at: now()
  }]
]);
let grade = 3;

const PATTERNS = [
  { pattern: 'diphthongs', label: 'Diphthongs', attempts: 24, misses: 9, distinct_words: 4, status: 'active', last_practiced: '2026-10-06 18:00:00' },
  { pattern: 'blends', label: 'Blends', attempts: 40, misses: 6, distinct_words: 3, status: 'active', last_practiced: '2026-10-05 18:00:00' },
  { pattern: 'silent_letters', label: 'Silent letters', attempts: 15, misses: 2, distinct_words: 1, status: 'watching', last_practiced: '2026-10-01 18:00:00' },
  { pattern: 'vowel_teams', label: 'Vowel teams', attempts: 52, misses: 3, distinct_words: 2, status: 'cleared', last_practiced: '2026-09-28 18:00:00' },
  { pattern: 'reversals', label: 'Letter mix-ups', attempts: 6, misses: 4, distinct_words: 3, status: 'watching', last_practiced: '2026-10-07 08:00:00' },
  { pattern: 'endings', label: 'Word endings', attempts: 3, misses: 0, distinct_words: 0, status: 'watching', last_practiced: '2026-09-20 18:00:00' }
].map(p => ({
  ...p, sessions_missed: 2, first_qualified_at: null, cleared_at: null, updated_at: p.last_practiced,
  accuracy: Math.round(((p.attempts - p.misses) / p.attempts) * 100),
  examples: [{ word: 'thousand', position: 3, expected: 'u', typed: 'w' }],
  report: null
}));

const REPORT = {
  summary: 'Your child sometimes mixes up ou and ow.',
  why_it_happens: 'Both spell the same sound, so the spelling has to be remembered.',
  practice_ideas: ['Sort words into ou and ow piles.', 'Notice that ow often ends a word.', 'Write each word twice.'],
  example_words: ['cloud', 'cow', 'found', 'town', 'shout']
};

/** Rough split for the mock only: break between two consonants after a vowel. */
const mockSplit = (w) => {
  const m = w.match(/^(.*?[aeiouy]+[^aeiouy])([^aeiouy].*[aeiouy].*)$/);
  return m ? `${m[1]}-${m[2]}` : w;
};

const send = (res, status, body) => {
  res.statusCode = status;
  if (body === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});
const json = async (req) => { try { return JSON.parse((await readBody(req)).toString() || '{}'); } catch { return {}; } };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/auth/me') return send(res, 200, { user: USER });
  if (p === '/api/auth/logout') return send(res, 204);

  if (p === '/api/spelling/lists' && m === 'GET') return send(res, 200, [...lists.values()]);
  let r = p.match(/^\/api\/spelling\/lists\/([\w-]+)$/);
  if (r && m === 'PUT') {
    const b = await json(req);
    const prev = lists.get(r[1]);
    const row = {
      id: r[1], name: b.name, words_raw: b.words_raw, is_default: b.is_default ?? 0,
      focus_groups: b.focus_groups ? JSON.stringify(b.focus_groups) : prev?.focus_groups ?? null,
      hints: b.hints ? JSON.stringify(b.hints) : prev?.hints ?? null,
      created_at: prev?.created_at ?? now(), updated_at: now()
    };
    lists.set(r[1], row);
    return send(res, prev ? 200 : 201, row);
  }
  if (r && m === 'DELETE') { lists.delete(r[1]); return send(res, 204); }

  if (p === '/api/spelling/attempts') { const b = await json(req); return send(res, 200, { recorded: b.attempts?.length ?? 0, duplicates: 0 }); }
  if (p === '/api/spelling/scores') {
    return send(res, 200, [
      { word: 'thousand', attempt_count: 12, error_count: 5, friction_score: 55, perfect_streak: 0, mastered_at: null, ai_suggestion: null, last_practiced: '2026-10-06 18:00:00' },
      { word: 'boy', attempt_count: 6, error_count: 0, friction_score: 0, perfect_streak: 3, mastered_at: '2026-10-05 18:00:00', ai_suggestion: null, last_practiced: '2026-10-05 18:00:00' }
    ]);
  }
  if (p === '/api/spelling/patterns' && m === 'GET') return send(res, 200, PATTERNS);
  if (p === '/api/spelling/patterns/positions') {
    const b = await json(req);
    const positions = {};
    for (const w of b.words || []) {
      const i = w.search(/nd$|nt$|st$/);
      if (i >= 0) positions[w] = [i, i + 1];
    }
    return send(res, 200, { positions });
  }
  r = p.match(/^\/api\/spelling\/patterns\/(\w+)\/(analyze|generate)$/);
  if (r && r[2] === 'analyze') { await wait(600); return send(res, 200, { ...REPORT, cached: false }); }
  if (r && r[2] === 'generate') { await wait(900); return send(res, 200, { words: ['cloud', 'flower', 'coin', 'royal', 'mouth'], requested: 5, rejected: 2 }); }

  if (p === '/api/spelling/profile') {
    if (m === 'PUT') grade = (await json(req)).grade ?? grade;
    return send(res, 200, { grade });
  }
  if (p === '/api/spelling/syllables') {
    const b = await json(req);
    await wait(400);
    return send(res, 200, { splits: Object.fromEntries((b.words || []).map(w => [w, mockSplit(w)])) });
  }
  if (p === '/api/spelling/import/photo') {
    const body = await readBody(req);
    await wait(1500);
    if (body.length === 0) return send(res, 415, { error: 'That file is empty.' });
    return send(res, 200, {
      title: 'U2W1 – Diphthongs: ou/ow',
      words: ['mouth', 'flower', 'around', 'tower', 'shout', 'brown', 'county', 'allow'],
      focus_groups: ['ou', 'ow'],
      hints: ['ow can come at the end of a word; ou almost never does']
    });
  }
  if (p === '/api/spelling/digest/latest') return send(res, 200, null);
  if (p === '/api/spelling/digest/prefs') return send(res, 200, { email_opt_in: false });
  r = p.match(/^\/api\/spelling\/scores\/([^/]+)(\/analyze)?$/);
  if (r && r[2]) return send(res, 200, { tip: 'The ou in thousand says "ow".', mnemonic: 'Ouch! A thousand bees!', breakdown: 'thou + sand', cached: true });
  if (r) return send(res, 404, { error: 'Not found' });

  return send(res, 404, { error: `Mock API: no handler for ${m} ${p}` });
}

export default function devMockApi() {
  return {
    name: 'spelling-dev-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        handle(req, res).catch(err => send(res, 500, { error: String(err) }));
      });
      server.config.logger.info('\n  🧪 Mock API on: logged in as mock.parent@example.com (layout testing only)\n');
    }
  };
}
