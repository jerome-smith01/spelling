// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

let loggedIn = true;
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: loggedIn }) }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login?redirect=/here' }));
vi.mock('../services/coachingApi', async (importOriginal) => ({
  ...(await importOriginal()),
  analyzeWord: vi.fn()
}));

import { analyzeWord } from '../services/coachingApi';
import AITipModal from './AITipModal';

const TIP = { tip: 'Love ends with a silent e.', mnemonic: 'The e sleeps at the end.', breakdown: 'lov + e', cached: false };

beforeEach(() => {
  loggedIn = true;
  analyzeWord.mockReset();
});
afterEach(cleanup);

describe('AITipModal', () => {
  it('shows a loading state, then the tip, mnemonic and breakdown', async () => {
    let resolve;
    analyzeWord.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<AITipModal word="love" onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'A tip for "love"' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/thinking/i);
    expect(analyzeWord).toHaveBeenCalledWith('love');

    resolve(TIP);
    expect(await screen.findByText(/Love ends with a silent e/)).toBeInTheDocument();
    expect(screen.getByText(/The e sleeps at the end/)).toBeInTheDocument();
    expect(screen.getByText(/lov \+ e/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('never calls the API for a signed-out visitor and offers a login link', () => {
    loggedIn = false;
    render(<AITipModal word="love" onClose={() => {}} />);
    expect(analyzeWord).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login?redirect=/here');
  });

  it.each([
    [503, /resting/i],
    [429, /used all of today/i],
    [409, /not tricky enough/i],
    [502, /not available right now/i]
  ])('shows a friendly message for HTTP %i', async (status, message) => {
    analyzeWord.mockRejectedValue(Object.assign(new Error('x'), { name: 'ApiError', status }));
    render(<AITipModal word="love" onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('asks the user to log in again when the session has expired', async () => {
    analyzeWord.mockRejectedValue(Object.assign(new Error('x'), { name: 'AuthError' }));
    render(<AITipModal word="love" onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/log in again/i);
  });

  it('shows an offline message when the network is down', async () => {
    analyzeWord.mockRejectedValue(Object.assign(new Error('x'), { name: 'NetworkError' }));
    render(<AITipModal word="love" onClose={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
  });
});
