import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { autoSplitText } from '../utils/autoSyllables';

/**
 * "Generate syllables": splits every unhyphenated word in `text` (dictionary first,
 * then the AI) and hands the result back through onText so the user can check it.
 */
export default function GenerateSyllablesButton({ text, onText }) {
  const { isLoggedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const run = async () => {
    setNotice('');
    setBusy(true);
    try {
      const { text: next, changed } = await autoSplitText(text);
      if (changed.length) {
        onText(next);
        setNotice(`Added syllables to ${changed.length} ${changed.length === 1 ? 'word' : 'words'}. Check them and fix any you like.`);
      } else {
        setNotice('No words needed syllables, or we could not split them right now.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
      <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }}
        onClick={run} disabled={busy || !isLoggedIn || !text.trim()}>
        {busy ? 'Generating syllables…' : '✂️ Generate syllables'}
      </button>
      {!isLoggedIn && (
        <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Log in to split words into syllables automatically.</span>
      )}
      {notice && <p role="status" style={{ fontSize: '0.8rem', margin: 0, color: 'var(--foreground)' }}>{notice}</p>}
    </div>
  );
}
