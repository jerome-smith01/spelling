import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { analyzePattern, coachingErrorMessage } from '../services/coachingApi';

/**
 * Parent-facing report for one active pattern. Shows the cached report straight
 * away; otherwise asks the API to generate it (the server caches the result).
 */
export default function PatternReportModal({ pattern, onClose }) {
  const [state, setState] = useState(
    pattern.report ? { status: 'ready', report: pattern.report, error: '' } : { status: 'loading', report: null, error: '' }
  );

  useEffect(() => {
    if (pattern.report) return undefined;
    let cancelled = false;
    analyzePattern(pattern.pattern)
      .then((report) => { if (!cancelled) setState({ status: 'ready', report, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ status: 'error', report: null, error: coachingErrorMessage(err) }); });
    return () => { cancelled = true; };
  }, [pattern]);

  const examples = (pattern.examples || []).slice(0, 5);

  return (
    <Modal title={pattern.label} onClose={onClose}>
      {state.status === 'loading' && <p role="status">Writing your report…</p>}
      {state.status === 'error' && <p role="alert">{state.error}</p>}

      {state.status === 'ready' && (
        <div className="pattern-report">
          <p>{state.report.summary}</p>
          <h3>Why this is tricky</h3>
          <p>{state.report.why_it_happens}</p>
          <h3>Ways to practice at home</h3>
          <ul>
            {state.report.practice_ideas.map((idea) => <li key={idea}>{idea}</li>)}
          </ul>
          <h3>Words to practice</h3>
          <p>{state.report.example_words.join(', ')}</p>
        </div>
      )}

      {examples.length > 0 && (
        <div className="pattern-examples">
          <h3>Recent misses</h3>
          <ul>
            {examples.map((e, i) => (
              <li key={`${e.word}-${e.position}-${i}`}>
                <strong>{e.word}</strong>: wrote {e.typed ? `"${e.typed}"` : 'nothing'} where "{e.expected}" belongs
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
