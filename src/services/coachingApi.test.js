// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./apiService', () => ({ apiFetch: vi.fn().mockResolvedValue({}) }));

import { apiFetch } from './apiService';
import { analyzePattern, analyzeWord, coachingErrorMessage, getPatterns, getScores } from './coachingApi';

beforeEach(() => apiFetch.mockClear());

describe('coachingApi', () => {
  it('calls the right endpoints', async () => {
    await getScores();
    await getPatterns();
    await analyzeWord("don't");
    await analyzePattern('silent_letters');
    expect(apiFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/spelling/scores',
      '/api/spelling/patterns',
      '/api/spelling/scores/don\'t/analyze',
      '/api/spelling/patterns/silent_letters/analyze'
    ]);
    expect(apiFetch.mock.calls[2][1]).toMatchObject({ method: 'POST' });
  });

  it('encodes words so they cannot alter the path', async () => {
    await analyzeWord('a/b?c');
    expect(apiFetch.mock.calls[0][0]).toBe('/api/spelling/scores/a%2Fb%3Fc/analyze');
  });

  it.each([
    [{ status: 503 }, /resting/i],
    [{ status: 429 }, /used all/i],
    [{ status: 409 }, /not tricky enough/i],
    [{ status: 404 }, /could not find/i],
    [{ status: 502 }, /not available/i],
    [{ name: 'AuthError' }, /log in again/i],
    [{ name: 'NetworkError' }, /offline/i],
    [undefined, /not available/i]
  ])('maps %o to a friendly message', (err, expected) => {
    expect(coachingErrorMessage(err)).toMatch(expected);
  });
});
