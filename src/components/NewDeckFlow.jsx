import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { autoSplitText } from '../utils/autoSyllables';
import { parseWordList } from '../utils/wordParser';
import PhotoImport from './PhotoImport';
import AiPromptCard, { BiggerListNote } from './AiPromptCard';
import GenerateSyllablesButton from './GenerateSyllablesButton';

const box = {
  backgroundColor: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-xl)',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
};
const field = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--card-border)',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--foreground)',
  fontSize: '0.9rem',
  boxSizing: 'border-box'
};

/** True when another deck already uses this name (case-insensitive). */
export function nameTaken(name, existingNames) {
  const key = name.trim().toLowerCase();
  return existingNames.some(n => n.trim().toLowerCase() === key);
}

/**
 * "+ New deck": name it (must be unique), then either upload a homework photo or
 * type the words. Nothing is created until the words are saved.
 */
export default function NewDeckFlow({ existingNames, onCreate, onCancel }) {
  const { isLoggedIn } = useAuth();
  const [step, setStep] = useState('name'); // name | choose | type
  const [name, setName] = useState('');
  const [words, setWords] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitName = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) { setError('Give the deck a name.'); return; }
    if (nameTaken(clean, existingNames)) { setError('You already have a deck with that name. Pick a different one.'); return; }
    setError('');
    setName(clean);
    setStep('choose');
  };

  const create = (payload) => {
    if (nameTaken(payload.name, existingNames)) return { success: false, error: 'You already have a deck with that name.' };
    return onCreate(payload);
  };

  const saveTyped = async () => {
    setError('');
    if (parseWordList(words).length === 0) { setError('Add at least one word.'); return; }
    setBusy(true);
    let text = words.trim();
    if (isLoggedIn) {
      try { text = (await autoSplitText(text)).text; } catch { /* keep the words as typed */ }
    }
    setBusy(false);
    const result = create({ name, wordsRaw: text });
    if (!result.success) setError(result.error);
  };

  if (step === 'name') {
    return (
      <form onSubmit={submitName} style={box} aria-label="New deck">
        <label htmlFor="new-deck-name" style={{ fontWeight: 700, color: 'var(--foreground)' }}>Name your new deck</label>
        <input id="new-deck-name" type="text" maxLength={100} autoFocus autoComplete="off" value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Week 4"
          aria-describedby={error ? 'new-deck-error' : undefined} style={field} />
        {error && <p id="new-deck-error" role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-verify">Next</button>
        </div>
      </form>
    );
  }

  return (
    <section style={box} aria-label={`Add words to ${name}`}>
      <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Add words to “{name}”</h3>
      {step === 'choose' && (
        <>
          <PhotoImport title={name} onCreateList={create} />
          <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700, alignSelf: 'flex-start' }}
            onClick={() => setStep('type')}>
            ⌨️ Type the words instead
          </button>
        </>
      )}
      {step === 'type' && (
        <>
          <BiggerListNote />
          <AiPromptCard />
          <label htmlFor="new-deck-words" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Words, one per line (hyphens show syllables{isLoggedIn ? '; we add them if you leave them out' : ''})
          </label>
          <textarea id="new-deck-words" rows={6} autoFocus value={words}
            onChange={(e) => { setWords(e.target.value); setError(''); }}
            placeholder={'lov-ing\njoy-ful\nkit-ten'}
            style={{ ...field, fontFamily: 'monospace', resize: 'vertical' }} />
          <GenerateSyllablesButton text={words} onText={setWords} />
          {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary-sm" onClick={() => { setStep('choose'); setError(''); }}>← Use a photo</button>
            <button type="button" className="btn-verify" onClick={saveTyped} disabled={busy}>
              {busy ? 'Splitting syllables…' : 'Save & Practice'}
            </button>
          </div>
        </>
      )}
      <button type="button" className="btn-secondary-sm" style={{ alignSelf: 'flex-start' }} onClick={onCancel}>Cancel</button>
    </section>
  );
}
