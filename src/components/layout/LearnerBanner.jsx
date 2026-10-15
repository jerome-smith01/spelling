import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearner } from '../../hooks/useLearner';

/** A grown-up is viewing or practicing as a child (not kid mode): say so, with a way back. */
export default function LearnerBanner() {
  const { activeLearner, kidMode, switchTo } = useLearner();
  const navigate = useNavigate();
  if (!activeLearner || kidMode) return null;
  return (
    <div className="learner-banner" role="status">
      <span>
        Showing <span aria-hidden="true">{activeLearner.avatar}</span> <strong>{activeLearner.display_name}</strong>
      </span>
      <button type="button" className="btn-secondary-sm" onClick={async () => { await switchTo(null, { kid: false }); navigate('/family'); }}>
        Back to me
      </button>
    </div>
  );
}
