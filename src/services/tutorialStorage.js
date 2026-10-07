/**
 * Tutorial progress (localStorage). Mirrors the Bible app: progress is tracked per
 * step key, never per screen, plus a one-time opt-in decision and a global on/off.
 *   { decided: boolean, enabled: boolean, completed: { [stepKey]: true } }
 */
export const TUTORIAL_KEY = 'spelling_tutorial_v1';
const DEFAULT = { decided: false, enabled: true, completed: {} };

export function loadTutorial() {
  try {
    const raw = localStorage.getItem(TUTORIAL_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveTutorial(state) {
  try {
    localStorage.setItem(TUTORIAL_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: tutorials still work for this page view
  }
}
