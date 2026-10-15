import React, { useEffect, useRef, useState } from 'react';
import { LEVELS } from '../utils/schedule';
import { useTutorial } from '../hooks/useTutorial';

// 'YYYY-MM-DD' <-> m/d/yy (the text the student types)
const toDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1].slice(2)}` : '';
};
const toIso = (text) => {
  const m = /^\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\s*$/.exec(text);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ViewIcon({ kind }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === 'grid'
        ? <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
        : <><rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></>}
    </svg>
  );
}

/** Test date typed as m/d/yy, with a calendar button that opens the browser's date picker. */
function TestDateField({ value, onChange }) {
  const [text, setText] = useState(toDisplay(value));
  const pickerRef = useRef(null);
  useEffect(() => { setText(toDisplay(value)); }, [value]);

  const commit = () => {
    if (!text.trim()) { onChange(null); return; }
    const iso = toIso(text);
    if (iso) onChange(iso); else setText(toDisplay(value));
  };

  return (
    <label className="settings-field">
      Test date
      <span className="date-field">
        <input
          type="text"
          inputMode="numeric"
          placeholder="m/d/yy"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        />
        <button type="button" className="date-field-btn" aria-label="Open calendar"
          onClick={() => { try { pickerRef.current?.showPicker(); } catch { pickerRef.current?.focus(); } }}>
          <CalendarIcon />
        </button>
        <input ref={pickerRef} type="date" className="date-field-native" tabIndex={-1} aria-hidden="true"
          value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
      </span>
    </label>
  );
}

/**
 * Deck-specific settings, in sections: Learning, Practice, Appearance, Maintenance.
 * `speechControls` (speed/pause) and `appearanceControls` (colors) are owned by the page and slotted in.
 */
export default function DeckSettings({ prefs, setPrefs, testDate, setTestDate, onReset, speechControls = null, appearanceControls = null }) {
  const tutorial = useTutorial();
  const num = (v, lo, hi, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
  };
  const views = [
    { value: 'deck', label: 'Flashcards' },
    { value: 'grid', label: 'Grid' }
  ];
  return (
    <div className="settings-sections" role="group" aria-label="Flashcard settings">
      <section className="settings-section" aria-label="Learning">
        <h3 className="settings-section-title">Learning</h3>
        <div className="settings-grid">
          <TestDateField value={testDate} onChange={setTestDate} />
          <label className="settings-field">
            Start new words at
            <select value={prefs.startLevel} onChange={(e) => setPrefs({ startLevel: Number(e.target.value) })}>
              {LEVELS.map(l => <option key={l.level} value={l.level}>Level {l.level}: {l.label}</option>)}
            </select>
          </label>
          <label className="settings-field">
            Move up at (%)
            <input type="number" min={50} max={100} value={prefs.advancePct}
              onChange={(e) => setPrefs({ advancePct: num(e.target.value, 50, 100, 100) })} />
          </label>
          <label className="settings-field">
            Drop back below (%)
            <input type="number" min={0} max={100} value={prefs.dropPct}
              onChange={(e) => setPrefs({ dropPct: num(e.target.value, 0, 100, 60) })} />
          </label>
        </div>
      </section>

      <section className="settings-section" aria-label="Practice">
        <h3 className="settings-section-title">Practice</h3>
        <div className="settings-field">
          View
          <div className="view-toggle" role="group" aria-label="View">
            {views.map(v => (
              <button key={v.value} type="button" className="view-toggle-btn"
                aria-pressed={prefs.view === v.value || (!prefs.view && v.value === 'deck')}
                onClick={() => setPrefs({ view: v.value })}>
                <ViewIcon kind={v.value} />{v.label}
              </button>
            ))}
          </div>
        </div>
        {speechControls}
      </section>

      {appearanceControls && (
        <section className="settings-section" aria-label="Appearance">
          <h3 className="settings-section-title">Appearance</h3>
          {appearanceControls}
        </section>
      )}

      <section className="settings-section" aria-label="Maintenance">
        <h3 className="settings-section-title">Maintenance</h3>
        <div className="settings-maint">
          <button type="button" className="btn-secondary-sm" onClick={tutorial.enableAll}>Show tutorials again</button>
          <button type="button" className="btn-secondary-sm settings-danger" onClick={() => {
            if (window.confirm('Reset all flashcard progress for this list?')) onReset();
          }}>Reset progress</button>
        </div>
      </section>
    </div>
  );
}
