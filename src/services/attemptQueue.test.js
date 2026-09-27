// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHUNK_SIZE, MAX_QUEUE, QUEUE_KEY, enqueue, flush, queueLength } from './attemptQueue';

const attempt = (i) => ({ word: 'control', letter: 'o', position: 1, correct: i % 2 });
const okResponse = () => new Response(JSON.stringify({ recorded: 1 }), { status: 200 });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('attemptQueue', () => {
  it('stamps each attempt with a unique client_id', () => {
    enqueue([attempt(0), attempt(1)]);
    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY));
    expect(stored).toHaveLength(2);
    expect(new Set(stored.map(a => a.client_id)).size).toBe(2);
  });

  it('caps the queue, dropping the oldest', () => {
    enqueue(Array.from({ length: MAX_QUEUE + 5 }, (_, i) => attempt(i)));
    expect(queueLength()).toBe(MAX_QUEUE);
  });

  it('flushes in chunks and empties the queue on success', async () => {
    enqueue(Array.from({ length: CHUNK_SIZE + 50 }, (_, i) => attempt(i)));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => okResponse());
    const sent = await flush();
    expect(sent).toBe(CHUNK_SIZE + 50);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(queueLength()).toBe(0);
  });

  it('keeps the queue when offline or the session expired', async () => {
    enqueue([attempt(0)]);
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('offline'));
    await expect(flush()).rejects.toMatchObject({ name: 'NetworkError' });
    expect(queueLength()).toBe(1);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(flush()).rejects.toMatchObject({ name: 'AuthError' });
    expect(queueLength()).toBe(1);
  });

  it('drops a chunk the server rejects with 400 so it cannot block the queue', async () => {
    enqueue([attempt(0)]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad' }), { status: 400 })
    );
    await flush();
    expect(queueLength()).toBe(0);
  });

  it('resends the same client_ids on retry (server dedupes)', async () => {
    enqueue([attempt(0)]);
    const bodies = [];
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async (_u, init) => { bodies.push(JSON.parse(init.body)); throw new TypeError('offline'); })
      .mockImplementationOnce(async (_u, init) => { bodies.push(JSON.parse(init.body)); return okResponse(); });
    await expect(flush()).rejects.toBeDefined();
    await flush();
    expect(bodies[0].attempts[0].client_id).toBe(bodies[1].attempts[0].client_id);
  });
});
