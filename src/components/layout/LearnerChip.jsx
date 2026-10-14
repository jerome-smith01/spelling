import React from 'react';
import { Link } from 'react-router-dom';
import { useLearner } from '../../hooks/useLearner';

/** Header control in kid mode: the child's avatar and name, linking to "Who's practising?". */
export default function LearnerChip() {
  const { activeLearner } = useLearner();
  return (
    <Link
      to="/who"
      className="btn-secondary-sm"
      style={{ fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      aria-label={`${activeLearner?.display_name ?? 'Child'} is practising. Switch who is practising`}
    >
      <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>{activeLearner?.avatar || '🙂'}</span>
      <span style={{ maxWidth: '7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeLearner?.display_name ?? 'Me'}</span>
    </Link>
  );
}
