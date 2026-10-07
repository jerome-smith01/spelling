// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TutorialProvider, useTutorial } from './useTutorial';
import TutorialOverlay from '../components/TutorialOverlay';
import TutorialPrompt from '../components/TutorialPrompt';
import { TUTORIAL_KEY } from '../services/tutorialStorage';

const steps = ['a', 'b', 'c', 'd', 'e'].map(k => ({ stepKey: `s_${k}`, target: null, title: `Title ${k}`, body: `Body ${k}` }));
let api;
function Probe() { api = useTutorial(); return null; }
const mount = () => render(<TutorialProvider><Probe /><TutorialOverlay /><TutorialPrompt onAccept={() => {}} /></TutorialProvider>);
const saved = () => JSON.parse(localStorage.getItem(TUTORIAL_KEY));

describe('tutorial controller', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('does not start until the user opted in', async () => {
    mount();
    expect(screen.getByText('Would you like a guided tour?')).toBeInTheDocument();
    let started;
    await act(async () => { started = await api.checkAndStart('k', steps); });
    expect(started).toBe(false);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show me' }));
    expect(saved()).toMatchObject({ decided: true, enabled: true });
  });

  it('queues at most 3 steps per visit and marks each step seen as it advances', async () => {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify({ decided: true, enabled: true, completed: {} }));
    const user = userEvent.setup();
    mount();
    await act(async () => { await api.checkAndStart('k', steps); });
    expect(screen.getByText('Title a')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Title c')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(Object.keys(saved().completed)).toEqual(['s_a', 's_b', 's_c']);
    // next visit shows the next unseen batch
    await act(async () => { await api.checkAndStart('k', steps); });
    expect(screen.getByText('Title d')).toBeInTheDocument();
  });

  it('cancel (Esc) marks nothing seen; Skip marks every step seen', async () => {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify({ decided: true, enabled: true, completed: {} }));
    const user = userEvent.setup();
    mount();
    await act(async () => { await api.checkAndStart('k', steps); });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(saved().completed).toEqual({});
    await act(async () => { await api.checkAndStart('k', steps); });
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(Object.keys(saved().completed)).toHaveLength(5);
    let started;
    await act(async () => { started = await api.checkAndStart('k', steps); });
    expect(started).toBe(false);
  });

  it('restart clears seen flags and re-enables tutorials', async () => {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify({ decided: true, enabled: false, completed: { s_a: true } }));
    mount();
    await act(async () => { await api.restart('k', steps); });
    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(saved().enabled).toBe(true);
  });
});
