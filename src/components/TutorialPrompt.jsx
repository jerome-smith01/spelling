import React from 'react';
import { useTutorial } from '../hooks/useTutorial';

/** One-time opt-in shown on first visit: "Would you like a guided tour?" */
export default function TutorialPrompt({ onAccept }) {
  const { decided, decide } = useTutorial();
  if (decided) return null;
  return (
    <div className="tut-prompt" role="region" aria-label="Guided tour">
      <div>
        <strong>Would you like a guided tour?</strong>
        <div className="deck-message" style={{ fontSize: '0.85rem' }}>
          A quick walkthrough of the flashcards. You can restart it any time with the ❓ Tour button.
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="button" className="btn-secondary-sm" onClick={() => decide(false)}>No thanks</button>
        <button type="button" className="btn-verify" onClick={() => { decide(true); onAccept(); }}>Show me</button>
      </div>
    </div>
  );
}
