// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUEUE_KEY, enqueue, flush, queueLength } from './attemptQueue';
import { learnerKey, setActiveLearner, getActiveLearnerId } from './activeLearner';

const attempt = (i) => ({ word: 'control', letter: 'o', position: 1, correct: i % 2 });
const ok = () => new Response(JSON.stringify({ recorded: 1 }), { status: 200 });
const KID_A = '11111111-aaaa-4aaa-8aaa-111111111111';
const KID_B = '22222222-bbbb-4bbb-8bbb-222222222222';

beforeEach(() => {
  localStorage.clear();
  setActiveLearner({ id: null });
  vi.restoreAllMocks();
});

describe('active learner', () => {
  it('survives in storage and is cleared by choosing yourself', () => {
    setActiveLearner({ id: KID_A, kid: true });
    expect(getActiveLearnerId()).toBe(KID_A);
    expect(JSON.parse(localStorage.getItem('spelling_tutor_active_learner_v1'))).toEqual({ id: KID_A, kid: true });
    setActiveLearner({ id: null });
    expect(getActiveLearnerId()).toBeNull();
    expect(localStorage.getItem('spelling_tutor_active_learner_v1')).toBeNull();
  });

  it('kid mode only exists for a child', () => {
    setActiveLearner({ id: null, kid: true });
    expect(JSON.parse(localStorage.getItem('spelling_tutor_active_learner_v1') || 'null')).toBeNull();
  });

  it('keeps the user\'s own storage key unchanged and gives each child a separate one', () => {
    expect(learnerKey('deck:x')).toBe('deck:x');
    setActiveLearner({ id: KID_A });
    expect(learnerKey('deck:x')).toBe(`deck:x:L${KID_A}`);
    expect(learnerKey('deck:x', KID_B)).toBe(`deck:x:L${KID_B}`);
    expect(learnerKey('deck:x', null)).toBe('deck:x');
  });
});

describe('attemptQueue with learners', () => {
  it('stamps attempts with the child who practised, and leaves the user\'s own unstamped', () => {
    enqueue([attempt(0)]);
    setActiveLearner({ id: KID_A, kid: true });
    enqueue([attempt(1)]);
    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(stored[0].learner_id).toBeUndefined();
    expect(stored[1].learner_id).toBe(KID_A);
  });

  it('sends one request per learner, naming that learner, in order, whoever is active when it flushes', async () => {
    enqueue([attempt(0)]);                         // the user
    setActiveLearner({ id: KID_A, kid: true });
    enqueue([attempt(1), attempt(2)]);             // child A
    setActiveLearner({ id: KID_B, kid: true });
    enqueue([attempt(3)]);                         // child B
    setActiveLearner({ id: KID_A, kid: true });
    enqueue([attempt(4)]);                         // child A again
    setActiveLearner({ id: null });                // flush while the user is active

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ok());
    expect(await flush()).toBe(5);
    expect(queueLength()).toBe(0);

    const sent = fetchMock.mock.calls.map(([, init]) => ({
      learner: init.headers['X-Spelling-Learner'] ?? null,
      n: JSON.parse(init.body).attempts.length,
      leaked: JSON.parse(init.body).attempts.some(a => 'learner_id' in a)
    }));
    expect(sent).toEqual([
      { learner: null, n: 1, leaked: false },
      { learner: KID_A, n: 3, leaked: false },   // both of A's batches in one request
      { learner: KID_B, n: 1, leaked: false }
    ]);
  });

  it('drops attempts for a child that no longer exists (404) without blocking the rest', async () => {
    setActiveLearner({ id: KID_A, kid: true });
    enqueue([attempt(0)]);
    setActiveLearner({ id: null });
    enqueue([attempt(1)]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
      .mockImplementation(async () => ok());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queueLength()).toBe(0);
  });

  it('still throws on a 404 for the user themselves (not a deleted child)', async () => {
    enqueue([attempt(0)]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 404 }));
    await expect(flush()).rejects.toMatchObject({ status: 404 });
    expect(queueLength()).toBe(1);
  });
});
