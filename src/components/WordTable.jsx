import React from 'react';
import StageBall from './StageBall';
import { PlayIcon } from './AudioIcons';
import { LEVELS } from '../utils/schedule';

const shortDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** What a row says about the word: level label, last score, and when it comes back. */
export function rowInfo(state, today) {
  if (!state) return { level: null, levelText: 'Not started', score: '—', next: 'Today' };
  const score = state.lastScore === null || state.lastScore === undefined ? '—' : `${state.lastScore}%`;
  if (state.mastered) return { level: 5, levelText: 'Learned', score, next: state.due ? shortDay(state.due) : '—', learned: true };
  const info = LEVELS[Math.min(Math.max(state.level || 1, 1), LEVELS.length) - 1];
  const next = !state.due || state.due <= today ? 'Today' : shortDay(state.due);
  return { level: state.level, levelText: `Level ${state.level}`, levelLabel: info.label, score, next };
}

/** List view: one row per word with its level, last score and next review, plus a play button. */
export default function WordTable({ words, progress, today, onSpeak }) {
  if (!words?.length) return null;
  return (
    <div className="word-table-wrap">
      <table className="word-table">
        <caption className="visually-hidden">Words with their level, last score, and next review</caption>
        <thead>
          <tr>
            <th scope="col"><span className="visually-hidden">Play</span></th>
            <th scope="col">Word</th>
            <th scope="col">Level</th>
            <th scope="col">Last score</th>
            <th scope="col">Next</th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => {
            const info = rowInfo(progress?.words?.[w.word], today);
            return (
              <tr key={w.id}>
                <td>
                  <button type="button" className="speaker-btn" onClick={() => onSpeak(w.id, w.word)}
                    aria-label={`Hear ${w.word}`}><PlayIcon /></button>
                </td>
                <th scope="row" className="word-table-word">{w.word}</th>
                <td title={info.levelLabel}>
                  <span className="word-table-level">
                    {info.level && <StageBall level={info.level} size={18} />}
                    {info.levelText}
                  </span>
                </td>
                <td>{info.score}</td>
                <td>{info.next}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
