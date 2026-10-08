import React, { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { buildLoginUrl } from '../services/apiService';
import { importPhoto } from '../services/smartApi';
import { reencodePhoto, PhotoError, ALLOWED_TYPES } from '../utils/imageReencode';
import { autoSplitText } from '../utils/autoSyllables';
import { parseFocusGroups } from '../utils/smartHide';

const box = {
  backgroundColor: 'var(--muted)',
  borderRadius: 'var(--radius-lg)',
  padding: '1rem',
  border: '1px solid var(--card-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem'
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
const label = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' };

function errorText(err) {
  if (err instanceof PhotoError) return err.message;
  if (err?.name === 'AuthError') return 'Log in again to import a photo.';
  if (err?.name === 'NetworkError') return "You're offline. Try again when you're back online.";
  return err?.message || 'Photo import is unavailable right now. Please try again later.';
}

/**
 * Homework photo -> one new list (smart hiding, Phase 3). The photo is re-encoded in
 * the browser, read by the server's vision model, auto-syllabified, and shown for
 * review; nothing is saved until the user taps Save.
 */
export default function PhotoImport({ onCreateList, title }) {
  const { isLoggedIn } = useAuth();
  const inputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | working | review
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  if (!isLoggedIn) {
    return (
      <div style={box}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>📷 Upload homework photo</span>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0 }}>
          <a href={buildLoginUrl()} style={{ color: 'var(--color-primary)' }}>Log in</a> to turn a photo of the
          homework into a word list, with syllables and focus letters filled in for you.
        </p>
      </div>
    );
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same file again still fires
    if (!file) return;
    setError('');
    setStatus('working');
    try {
      const blob = await reencodePhoto(file);
      const list = await importPhoto(blob);
      const { text } = await autoSplitText((list.words || []).join('\n'));
      setReview({
        title: title || list.title || 'Homework list',
        words: text,
        focus: (list.focus_groups || []).join(', '),
        hints: (list.hints || []).join('\n')
      });
      setStatus('review');
    } catch (err) {
      setError(errorText(err));
      setStatus('idle');
    }
  };

  const save = () => {
    const result = onCreateList({
      name: review.title,
      wordsRaw: review.words,
      focusGroups: parseFocusGroups(review.focus),
      hints: review.hints.split('\n').map(h => h.trim()).filter(Boolean)
    });
    if (result?.success) {
      setReview(null);
      setStatus('idle');
    } else {
      setError(result?.error || 'Could not save the list.');
    }
  };

  if (status === 'review' && review) {
    const set = (k) => (e) => setReview(r => ({ ...r, [k]: e.target.value }));
    return (
      <div style={box} role="group" aria-label="Check the imported list">
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>📷 Check the list from your photo</span>
        <div>
          <label htmlFor="photo-title" style={label}>List name</label>
          <input id="photo-title" type="text" maxLength={100} value={review.title} onChange={set('title')} style={field} />
        </div>
        <div>
          <label htmlFor="photo-words" style={label}>Words (hyphens show syllables)</label>
          <textarea id="photo-words" rows={6} value={review.words} onChange={set('words')}
            style={{ ...field, fontFamily: 'monospace', resize: 'vertical' }} />
        </div>
        <div>
          <label htmlFor="photo-focus" style={label}>Focus letters</label>
          <input id="photo-focus" type="text" value={review.focus} onChange={set('focus')} placeholder="ou, ow, oi, oy"
            style={{ ...field, fontFamily: 'monospace' }} />
        </div>
        <div>
          <label htmlFor="photo-hints" style={label}>Lesson hints (one per line, shown after a miss)</label>
          <textarea id="photo-hints" rows={2} value={review.hints} onChange={set('hints')} style={{ ...field, resize: 'vertical' }} />
        </div>
        {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary-sm" onClick={() => { setReview(null); setStatus('idle'); setError(''); }}>
            Discard
          </button>
          <button type="button" className="btn-verify" onClick={save} disabled={!review.words.trim()}>Save list</button>
        </div>
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>📷 Upload homework photo</span>
        <button type="button" className="btn-secondary-sm" style={{ fontWeight: 700 }}
          onClick={() => inputRef.current?.click()} disabled={status === 'working'}>
          {status === 'working' ? 'Reading photo…' : 'Choose photo'}
        </button>
        <input ref={inputRef} type="file" accept={ALLOWED_TYPES.join(',')} onChange={onFile}
          aria-label="Homework photo" style={{ display: 'none' }} />
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.4 }}>
        One photo makes one list: we read the words, title, focus letters and hints, then you check them before saving.
        The photo itself is never stored.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
        💡 Bigger list? Use <strong>Advanced → Copy AI prompt</strong> with any AI tool, then paste the result below.
      </p>
      {status === 'working' && <p role="status" style={{ fontSize: '0.8rem', margin: 0 }}>Reading your photo… this can take a few seconds.</p>}
      {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
    </div>
  );
}
