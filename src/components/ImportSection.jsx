import React, { useState, useEffect } from 'react';
import { parseFocusGroups } from '../utils/smartHide';
import { useAuth } from '../hooks/useAuth';
import { buildLoginUrl } from '../services/apiService';
import { isOneSyllable } from '../utils/syllableDictionary';
import { wordsNeedingSplit } from '../utils/wordParser';
import { autoSplitText } from '../utils/autoSyllables';
import PhotoImport from './PhotoImport';
import AiPromptCard from './AiPromptCard';
import GenerateSyllablesButton from './GenerateSyllablesButton';

export default function ImportSection({
  isExpanded,
  onClose,
  currentRaw,
  currentFocus = [],
  onImport,
  onCreateList,
  onResetDefault
}) {
  const [inputText, setInputText] = useState(currentRaw);
  const [focusText, setFocusText] = useState(currentFocus.join(', '));
  const [errorMessage, setErrorMessage] = useState('');
  const [splitNotice, setSplitNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setInputText(currentRaw);
  }, [currentRaw]);

  const focusKey = currentFocus.join(', ');
  useEffect(() => {
    setFocusText(focusKey);
  }, [focusKey]);

  if (!isExpanded) return null;

  const unsplit = wordsNeedingSplit(inputText, isOneSyllable);

  const handleSave = async () => {
    setErrorMessage('');
    // Auto-syllables (logged in): split unhyphenated words, then let the user check them first
    if (isLoggedIn && unsplit.length) {
      setBusy(true);
      const { text, changed } = await autoSplitText(inputText);
      setBusy(false);
      if (changed.length) {
        setInputText(text);
        setSplitNotice(`We split ${changed.length} ${changed.length === 1 ? 'word' : 'words'} into syllables. Check them, fix any you like, then press Save again.`);
        return;
      }
    }
    setSplitNotice('');
    const result = onImport(inputText, { focusGroups: parseFocusGroups(focusText) });
    if (result.success) {
      onClose(); // Collapse back to toolbar after successful save
    } else {
      setErrorMessage(result.error || 'Failed to import words.');
    }
  };

  const handleReset = () => {
    onResetDefault();
    setErrorMessage('');
  };

  return (
    <div style={{
      borderTop: '1px solid var(--card-border)',
      marginTop: '1rem',
      paddingTop: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      animation: 'fadeIn 0.25s ease'
    }}>
      {/* Title & Close Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: 0
          }}>
            Import Spelling Words
          </h3>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--muted-foreground)',
            backgroundColor: 'var(--muted)',
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            fontWeight: 600
          }}>
            Custom List
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-secondary-sm"
          style={{ fontSize: '0.75rem' }}
          aria-label="Collapse import section"
        >
          Close &times;
        </button>
      </div>

      {onCreateList && <PhotoImport onCreateList={onCreateList} />}

      {/* Advanced: copy the AI prompt to use with any AI tool (bigger lists) */}
      <AiPromptCard />

      {/* Word List Textarea */}
      <div>
        <label
          htmlFor="inline-words-input"
          style={{
            display: 'block',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            marginBottom: '0.4rem'
          }}
        >
          Words (hyphens for syllables; optional (phonetics) for tricky words):
        </label>
        <textarea
          id="inline-words-input"
          rows={6}
          value={inputText}
          onChange={(e) => { setInputText(e.target.value); setSplitNotice(''); }}
          placeholder="lov-ing&#10;joy-ful&#10;pret-ty (prit-tee)&#10;hand-some (hand-sum)&#10;kit-ten&#10;pup-py"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div style={{ marginTop: '0.5rem' }}>
          <GenerateSyllablesButton text={inputText} onText={(t) => { setInputText(t); setSplitNotice(''); }} />
        </div>
        {splitNotice && (
          <p role="status" style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--foreground)' }}>
            ✂️ {splitNotice}
          </p>
        )}
        {!isLoggedIn && unsplit.length > 0 && (
          <p style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--muted-foreground)' }}>
            Add hyphens to show syllables (e.g. foun-tain), or{' '}
            <a href={buildLoginUrl()} style={{ color: 'var(--color-primary)' }}>log in</a> to split them automatically.
          </p>
        )}
        <label
          htmlFor="inline-focus-input"
          style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', margin: '0.9rem 0 0.4rem' }}
        >
          Focus letters <span style={{ fontWeight: 400, color: 'var(--muted-foreground)' }}>(optional, turns on smart hiding)</span>
        </label>
        <input
          id="inline-focus-input"
          type="text"
          value={focusText}
          onChange={(e) => setFocusText(e.target.value)}
          placeholder="ou, ow, oi, oy"
          aria-describedby="inline-focus-help"
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            boxSizing: 'border-box'
          }}
        />
        <p id="inline-focus-help" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0.3rem 0 0' }}>
          The letter groups this week's lesson is about. Practice hides these letters first.
        </p>
        {errorMessage && (
          <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            {errorMessage}
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary-sm"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Reset to 3rd-Grade Default
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="btn-verify"
            style={{
              backgroundColor: 'var(--selected-color)',
              borderColor: 'var(--selected-color-border)',
              color: '#ffffff'
            }}
          >
            {busy ? 'Splitting syllables…' : 'Save & Practice'}
          </button>
        </div>
      </div>
    </div>
  );
}
