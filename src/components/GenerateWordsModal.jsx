import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useLists } from '../hooks/useLists';
import { generatePatternWords } from '../services/smartApi';
import { coachingErrorMessage } from '../services/coachingApi';
import { parseWordList } from '../utils/wordParser';
import { autoSplitText } from '../utils/autoSyllables';

const NEW = '__new__';

function errorText(err) {
  if (err?.status === 429) return "You've used all of today's word requests. Please try again tomorrow.";
  if (err?.status === 503) return 'Word ideas are resting for today. Please try again tomorrow.';
  return coachingErrorMessage(err);
}

/**
 * "Generate 5 words" for one pattern, then add them to an existing list or a new
 * list named after the pattern. Words are syllabified before saving.
 */
export default function GenerateWordsModal({ pattern, onClose, onSaved }) {
  const { lists, createList, saveWords, atListLimit } = useLists();
  const [state, setState] = useState({ status: 'loading', words: [], error: '' });
  const [target, setTarget] = useState(lists[0]?.id ?? NEW);
  const [newName, setNewName] = useState(`${pattern.label} practice`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const exclude = [...new Set(lists.flatMap(l => parseWordList(l.wordsRaw).map(w => w.word)))];
    generatePatternWords(pattern.pattern, exclude)
      .then(res => { if (!cancelled) setState({ status: 'ready', words: res?.words || [], error: '' }); })
      .catch(err => { if (!cancelled) setState({ status: 'error', words: [], error: errorText(err) }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern.pattern]);

  const save = async () => {
    setSaving(true);
    const list = lists.find(l => l.id === target);
    const already = new Set(list ? parseWordList(list.wordsRaw).map(w => w.word) : []);
    const fresh = state.words.filter(w => !already.has(w));
    const { text } = await autoSplitText(fresh.join('\n'));
    const id = list
      ? saveWords(list.id, `${list.wordsRaw.trim()}\n${text}`.trim())
      : createList(newName, text);
    setSaving(false);
    onSaved?.(id);
  };

  return (
    <Modal title={`Practice words: ${pattern.label}`} onClose={onClose}>
      {state.status === 'loading' && <p role="status">Finding 5 words…</p>}
      {state.status === 'error' && <p role="alert">{state.error}</p>}
      {state.status === 'ready' && state.words.length === 0 && (
        <p role="alert">We couldn't find suitable words this time. Please try again later.</p>
      )}
      {state.status === 'ready' && state.words.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <ul className="generated-words" aria-label="Generated words">
            {state.words.map(w => <li key={w}>{w}</li>)}
          </ul>
          <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <legend style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Where should they go?</legend>
            {lists.length > 0 && (
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="radio" name="gen-target" checked={target !== NEW} onChange={() => setTarget(lists[0].id)} />
                Add to
                <select className="speed-preset-select" value={target === NEW ? lists[0].id : target}
                  onChange={(e) => setTarget(e.target.value)} aria-label="List to add to">
                  {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
            )}
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="radio" name="gen-target" checked={target === NEW} onChange={() => setTarget(NEW)} disabled={atListLimit} />
              Create a new list
              <input type="text" value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)}
                aria-label="New list name" disabled={target !== NEW}
                style={{ padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--foreground)' }} />
            </label>
          </fieldset>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn-secondary-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-verify" onClick={save} disabled={saving || (target === NEW && atListLimit)}>
              {saving ? 'Saving…' : 'Save words'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
