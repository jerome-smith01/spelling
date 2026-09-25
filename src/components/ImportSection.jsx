import React, { useState, useEffect } from 'react';

const AI_PROMPT_TEMPLATE = `You are a spelling assistant. I will give you a list of spelling words, a photo of a spelling worksheet, or raw text.
Return ONLY the words segmented into syllables using hyphens, one word per line, inside a single plain text code block.
No numbers, no explanations, no markdown or punctuation other than hyphens.

Example output:
lov-ing
joy-ful
pret-ty
hand-some
kit-ten
pup-py`;

export default function ImportSection({
  isExpanded,
  onClose,
  currentRaw,
  onImport,
  onResetDefault
}) {
  const [inputText, setInputText] = useState(currentRaw);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setInputText(currentRaw);
  }, [currentRaw]);

  if (!isExpanded) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = AI_PROMPT_TEMPLATE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleSave = () => {
    setErrorMessage('');
    const result = onImport(inputText);
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

      {/* AI Prompt Generator Card */}
      <div style={{
        backgroundColor: 'var(--muted)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        border: '1px solid var(--card-border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>
            🪄 AI Prompt Generator
          </span>
          <button
            type="button"
            onClick={handleCopyPrompt}
            className="btn-secondary-sm"
            style={{
              color: copyFeedback ? 'var(--selected-color-border)' : 'var(--foreground)',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}
          >
            {copyFeedback ? '✓ Copied!' : 'Copy AI Prompt'}
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
          Paste this prompt into ChatGPT, Claude, or Gemini along with a photo or raw list from your student's school sheet:
        </p>
        <pre style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          maxHeight: '110px',
          overflowY: 'auto',
          color: 'var(--foreground)',
          margin: 0
        }}>
          {AI_PROMPT_TEMPLATE}
        </pre>
      </div>

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
          Words (use hyphens for syllables, one word per line):
        </label>
        <textarea
          id="inline-words-input"
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="lov-ing&#10;joy-ful&#10;pret-ty&#10;hand-some&#10;kit-ten&#10;pup-py"
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
            className="btn-verify"
            style={{
              backgroundColor: 'var(--selected-color)',
              borderColor: 'var(--selected-color-border)',
              color: '#ffffff'
            }}
          >
            Save & Practice
          </button>
        </div>
      </div>
    </div>
  );
}
