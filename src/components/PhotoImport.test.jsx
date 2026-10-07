// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

const auth = { isLoggedIn: true };
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('../services/apiService', () => ({ buildLoginUrl: () => '/login' }));
const importPhoto = vi.fn();
const splitSyllables = vi.fn(async () => ({ splits: {} }));
vi.mock('../services/smartApi', () => ({ importPhoto: (...a) => importPhoto(...a), splitSyllables: (...a) => splitSyllables(...a) }));
vi.mock('../utils/imageReencode', async (orig) => ({ ...(await orig()), reencodePhoto: vi.fn(async () => new Blob(['x'])) }));

import PhotoImport from './PhotoImport';
import { photoProblem, fitSize } from '../utils/imageReencode';

const file = (name = 'hw.jpg', type = 'image/jpeg') => new File(['x'], name, { type });

describe('PhotoImport', () => {
  beforeEach(() => { auth.isLoggedIn = true; importPhoto.mockReset(); });
  afterEach(cleanup);

  it('logged out: asks the user to log in', () => {
    auth.isLoggedIn = false;
    render(<PhotoImport onCreateList={() => ({ success: true })} />);
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Homework photo')).not.toBeInTheDocument();
  });

  it('shows the review screen with syllables split, then saves one list', async () => {
    importPhoto.mockResolvedValue({
      title: 'U1W5 – Diphthongs', words: ['thousand', 'boy'], focus_groups: ['ou', 'oy'], hints: ['oy ends words']
    });
    const onCreateList = vi.fn(() => ({ success: true }));
    const user = userEvent.setup();
    render(<PhotoImport onCreateList={onCreateList} />);
    await user.upload(screen.getByLabelText('Homework photo'), file());
    expect(await screen.findByLabelText('List name')).toHaveValue('U1W5 – Diphthongs');
    expect(screen.getByLabelText(/^Words/)).toHaveValue('thou-sand\nboy');
    expect(screen.getByLabelText('Focus letters')).toHaveValue('ou, oy');
    await user.click(screen.getByRole('button', { name: 'Save list' }));
    expect(onCreateList).toHaveBeenCalledWith({
      name: 'U1W5 – Diphthongs', wordsRaw: 'thou-sand\nboy', focusGroups: ['ou', 'oy'], hints: ['oy ends words']
    });
  });

  it('shows the server message when no word list is found', async () => {
    importPhoto.mockRejectedValue(Object.assign(new Error("We couldn't find a word list in that photo."), { status: 422 }));
    const user = userEvent.setup();
    render(<PhotoImport onCreateList={() => ({ success: true })} />);
    await user.upload(screen.getByLabelText('Homework photo'), file());
    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't find a word list");
  });
});

describe('imageReencode helpers', () => {
  it('rejects HEIC, SVG, GIF and empty files with friendly messages', () => {
    expect(photoProblem(file('a.heic', 'image/heic'))).toMatch(/HEIC/);
    expect(photoProblem(file('a.svg', 'image/svg+xml'))).toMatch(/JPEG, PNG or WebP/);
    expect(photoProblem(file('a.gif', 'image/gif'))).toMatch(/JPEG, PNG or WebP/);
    expect(photoProblem(new File([], 'a.jpg', { type: 'image/jpeg' }))).toMatch(/empty/);
    expect(photoProblem(file())).toBe('');
  });
  it('fits the long edge to 1600px without upscaling', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
