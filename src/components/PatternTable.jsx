import React, { useState } from 'react';
import HarveyBall from './HarveyBall';
import { SORTS, loadSort, saveSort, sortPatterns, accuracyQuarters } from '../utils/patternTable';
import { formatSqlDate } from '../utils/progress';

const STATUS = { active: 'Working on it', watching: 'Watching', cleared: 'Cleared' };
// Patterns the tagger can't confirm from spelling alone (server refuses to generate them)
const NO_GENERATE = new Set(['reversals', 'high_frequency_irregular']);

/**
 * Sortable pattern progress table: a grid on wide screens, one card per pattern on
 * phones (the pattern name is the card title). Sort choice is remembered per user.
 */
export default function PatternTable({ patterns, userId, onOpenReport, onGenerate }) {
  const [sort, setSort] = useState(() => loadSort(userId));
  const rows = sortPatterns(patterns, sort);
  const changeSort = (id) => { setSort(id); saveSort(userId, id); };

  return (
    <section className="grid-table-card" aria-labelledby="pattern-table-heading">
      <div className="grid-table-toolbar">
        <h3 id="pattern-table-heading" style={{ margin: 0 }}>Pattern progress</h3>
        <label className="settings-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
          Sort
          <select value={sort} onChange={(e) => changeSort(e.target.value)} className="speed-preset-select">
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
          Patterns appear here once your child has practiced some words.
        </p>
      ) : (
        <div className="grid-table" role="table" aria-label="Pattern progress">
          <div className="grid-table-head" role="row">
            <span role="columnheader">Pattern</span>
            <span role="columnheader">Progress</span>
            <span role="columnheader">Attempts</span>
            <span role="columnheader">Last practiced</span>
            <span role="columnheader">Status</span>
            <span role="columnheader"><span className="sr-only">Actions</span></span>
          </div>
          {rows.map(p => {
            const accuracy = p.accuracy ?? null;
            return (
              <div className="grid-table-row" role="row" key={p.pattern}>
                <span role="cell" className="grid-table-title">{p.label}</span>
                <span role="cell" data-label="Progress" className="grid-table-progress">
                  <HarveyBall quarters={accuracyQuarters(accuracy)} size={18} />
                  {accuracy == null ? '—' : `${accuracy}%`}
                </span>
                <span role="cell" data-label="Attempts">{p.attempts ?? 0}</span>
                <span role="cell" data-label="Last practiced">{formatSqlDate(p.last_practiced)}</span>
                <span role="cell" data-label="Status">{STATUS[p.status] || p.status}</span>
                <span role="cell" className="grid-table-actions">
                  {p.status === 'active' && (
                    <button type="button" className="btn-secondary-sm" onClick={() => onOpenReport(p)}
                      aria-label={`Read the report for ${p.label}`}>Report</button>
                  )}
                  {!NO_GENERATE.has(p.pattern) && (
                    <button type="button" className="btn-secondary-sm" onClick={() => onGenerate(p)}
                      aria-label={`Generate 5 words for ${p.label}`}>Generate 5 words</button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
