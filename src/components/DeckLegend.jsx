import React from 'react';
import Modal from './Modal';
import StageBall from './StageBall';
import { LEVELS } from '../utils/schedule';
import { CheckIcon, CloseIcon, QuestionIcon } from './SessionIcons';

/** What the card's symbols mean: stage balls first, then the session progress dots. */
export default function DeckLegend({ onClose }) {
  return (
    <Modal title="Legend" onClose={onClose}>
      <h3 className="legend-heading">Stage</h3>
      <ul className="legend-list">
        {LEVELS.map(l => (
          <li key={l.level}>
            <StageBall level={l.level} />
            <span>Stage {l.level}: {l.label}</span>
          </li>
        ))}
      </ul>
      <h3 className="legend-heading">Session progress</h3>
      <ul className="legend-list">
        <li><span className="sess-dot ok"><CheckIcon /></span><span>Scored 100%</span></li>
        <li><span className="sess-dot miss"><CloseIcon /></span><span>Missed</span></li>
        <li><span className="sess-dot skip"><QuestionIcon /></span><span>Skipped</span></li>
        <li><span className="sess-dot current" /><span>Current card</span></li>
        <li><span className="sess-dot" /><span>Not reached yet</span></li>
      </ul>
    </Modal>
  );
}
