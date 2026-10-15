import React, { useEffect, useRef, useState } from 'react';
import { LEVELS, DEFAULT_PREFS } from '../utils/schedule';
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

const snap5 = (v) => Math.round(Number(v) / 5) * 5; // grading is set in multiples of 5
const GRADE_GAP = 5; // the two handles always stay at least this far apart

function MaintIcon({ children }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
  );
}

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
      {kind === 'list'
        ? <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>
        : kind === 'grid'
        ? <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
        : <><rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></>}
    </svg>
  );
}

/**
 * One bar for both grading thresholds: the red handle is "drop back below", the green one is
 * "move up at". The zones show what a card's score does; the handles can't cross.
 */
function GradingBar({ advancePct: savedAdvance, dropPct: savedDrop, onChange }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const advancePct = Math.min(100, Math.max(snap5(savedAdvance), 50));
  const dropPct = Math.max(0, Math.min(snap5(savedDrop), advancePct - GRADE_GAP));
  const atDefault = advancePct === DEFAULT_PREFS.advancePct && dropPct === DEFAULT_PREFS.dropPct;
  return (
    <div className="settings-field settings-field-wide">
      <div className="slider-label">
        <span>Grading</span>
        <span className="slider-actions">
          <button type="button" className="slider-icon-btn" aria-label="What do the grading handles do?"
            aria-expanded={helpOpen} aria-controls="grading-help" onClick={() => setHelpOpen(o => !o)}>?</button>
          <button type="button" className="slider-icon-btn" onClick={() => onChange({ advancePct: DEFAULT_PREFS.advancePct, dropPct: DEFAULT_PREFS.dropPct })}
            disabled={atDefault} aria-label="Restore grading to defaults" title={`Restore defaults (${DEFAULT_PREFS.dropPct}% / ${DEFAULT_PREFS.advancePct}%)`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>
        </span>
      </div>
      {helpOpen && (
        <p id="grading-help" className="slider-help">
          Score at or above the green handle and the word moves up a level. Score below the red handle and it drops back a level.
          In between, it stays where it is. The green handle always stays at least 5% above the red one.
        </p>
      )}
      <div className="grading-bar">
        <div className="grading-zone grading-down" style={{ left: 0, width: `${dropPct}%` }} />
        <div className="grading-zone grading-stay" style={{ left: `${dropPct}%`, width: `${advancePct - dropPct}%` }} />
        <div className="grading-zone grading-up" style={{ left: `${advancePct}%`, width: `${100 - advancePct}%` }} />
        <input type="range" className="grading-range grading-range-drop" min={0} max={100} step={5} value={dropPct}
          aria-label="Drop back below"
          onChange={(e) => onChange({ dropPct: Math.min(snap5(e.target.value), advancePct - GRADE_GAP) })} />
        <input type="range" className="grading-range grading-range-adv" min={0} max={100} step={5} value={advancePct}
          aria-label="Move up at"
          onChange={(e) => onChange({ advancePct: Math.max(snap5(e.target.value), dropPct + GRADE_GAP, 50) })} />
      </div>
      <div className="grading-ticks" aria-hidden="true"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
      <div className="grading-legend">
        <span><i className="grading-dot grading-down" />Drops back below {dropPct}%</span>
        <span><i className="grading-dot grading-stay" />Stays at {dropPct}-{advancePct - 1}%</span>
        <span><i className="grading-dot grading-up" />Moves up at {advancePct}%</span>
      </div>
    </div>
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
export default function DeckSettings({ prefs, setPrefs, testDate, setTestDate, onReset, speechControls = null, appearanceControls = null, deleteControl = null }) {
  const tutorial = useTutorial();
  const num = (v, lo, hi, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
  };
  const views = [
    { value: 'deck', label: 'Flashcards' },
    { value: 'grid', label: 'Grid' },
    { value: 'list', label: 'List', placeholder: true } // not built yet
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
          <GradingBar advancePct={prefs.advancePct} dropPct={prefs.dropPct} onChange={setPrefs} />
        </div>
      </section>

      <section className="settings-section" aria-label="Practice">
        <h3 className="settings-section-title">Practice</h3>
        <div className="settings-field">
          View
          <div className="view-toggle" role="group" aria-label="View">
            {views.map(v => (
              <button key={v.value} type="button" className="view-toggle-btn"
                aria-pressed={!v.placeholder && (prefs.view === v.value || (!prefs.view && v.value === 'deck'))}
                aria-disabled={v.placeholder || undefined}
                title={v.placeholder ? 'Coming soon' : undefined}
                onClick={() => { if (!v.placeholder) setPrefs({ view: v.value }); }}>
                <ViewIcon kind={v.value} />{v.label}
              </button>
            ))}
          </div>
        </div>
        {speechControls}
      </section>

      {appearanceControls && (
        <section className="settings-section settings-section-appearance" aria-label="Appearance">
          <h3 className="settings-section-title">Appearance</h3>
          {appearanceControls}
        </section>
      )}

      <section className="settings-section" aria-label="Maintenance">
        <h3 className="settings-section-title">Maintenance</h3>
        <div className="settings-maint">
          <button type="button" className="btn-secondary-sm settings-maint-btn" onClick={tutorial.enableAll}>
            <MaintIcon><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></MaintIcon>
            Show tutorials again
          </button>
          <button type="button" className="btn-secondary-sm settings-maint-btn settings-danger" onClick={() => {
            if (window.confirm('Reset all flashcard progress for this list?')) onReset();
          }}>
            <MaintIcon><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></MaintIcon>
            Reset progress
          </button>
          {deleteControl}
        </div>
      </section>
    </div>
  );
}
