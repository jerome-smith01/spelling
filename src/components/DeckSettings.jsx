import React from 'react';
import { LEVELS } from '../utils/schedule';
import { useTutorial } from '../hooks/useTutorial';

/** Deck-specific settings: test date, starting level, grading thresholds, view. */
export default function DeckSettings({ prefs, setPrefs, testDate, setTestDate, today, onReset }) {
  const tutorial = useTutorial();
  const num = (v, lo, hi, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
  };
  return (
    <div className="settings-grid" role="group" aria-label="Flashcard settings">
      <label className="settings-field">
        Test date
        <input
          type="date"
          value={testDate || ''}
          min={today}
          onChange={(e) => setTestDate(e.target.value || null)}
        />
      </label>
      <label className="settings-field">
        Start new words at
        <select value={prefs.startLevel} onChange={(e) => setPrefs({ startLevel: Number(e.target.value) })}>
          {LEVELS.map(l => <option key={l.level} value={l.level}>Level {l.level}: {l.label}</option>)}
        </select>
      </label>
      <label className="settings-field">
        Advance at accuracy ≥ (%)
        <input type="number" min={50} max={100} value={prefs.advancePct}
          onChange={(e) => setPrefs({ advancePct: num(e.target.value, 50, 100, 100) })} />
      </label>
      <label className="settings-field">
        Drop back below (%)
        <input type="number" min={0} max={100} value={prefs.dropPct}
          onChange={(e) => setPrefs({ dropPct: num(e.target.value, 0, 100, 60) })} />
      </label>
      <label className="settings-field">
        View
        <select value={prefs.view} onChange={(e) => setPrefs({ view: e.target.value })}>
          <option value="deck">Flashcards (one at a time)</option>
          <option value="grid">Grid (all words)</option>
        </select>
      </label>
      <div className="settings-field">
        Progress
        <button type="button" className="btn-secondary-sm" onClick={() => {
          if (window.confirm('Reset all flashcard progress for this list?')) onReset();
        }}>Reset progress</button>
      </div>
      <div className="settings-field">
        Tutorials
        <button type="button" className="btn-secondary-sm" onClick={tutorial.enableAll}>Enable all tutorials</button>
      </div>
    </div>
  );
}
