import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../hooks/useAuth';
import { buildLoginUrl } from '../services/apiService';
import { analyzeWord, coachingErrorMessage } from '../services/coachingApi';

/** Kid-friendly coaching tip for a tricky word (opened from the flame on a word card). */
export default function AITipModal({ word, onClose }) {
  const { isLoggedIn } = useAuth();
  const [state, setState] = useState({ status: isLoggedIn ? 'loading' : 'anonymous', tip: null, error: '' });

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let cancelled = false;
    setState({ status: 'loading', tip: null, error: '' });
    analyzeWord(word)
      .then((tip) => { if (!cancelled) setState({ status: 'ready', tip, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ status: 'error', tip: null, error: coachingErrorMessage(err) }); });
    return () => { cancelled = true; };
  }, [isLoggedIn, word]);

  return (
    <Modal title={`A tip for "${word}"`} onClose={onClose}>
      {state.status === 'loading' && <p role="status">Thinking of a good trick…</p>}

      {state.status === 'anonymous' && (
        <p>
          <a href={buildLoginUrl()}>Log in</a> to get a memory trick for this tricky word.
        </p>
      )}

      {state.status === 'error' && <p role="alert">{state.error}</p>}

      {state.status === 'ready' && (
        <div className="coach-tip">
          <p><strong>Try this:</strong> {state.tip.tip}</p>
          <p><strong>Remember it:</strong> {state.tip.mnemonic}</p>
          <p><strong>Break it apart:</strong> {state.tip.breakdown}</p>
        </div>
      )}
    </Modal>
  );
}
