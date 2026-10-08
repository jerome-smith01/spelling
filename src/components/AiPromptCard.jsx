import React, { useState } from 'react';

export const AI_PROMPT_TEMPLATE = `You are a spelling assistant. I will give you a list of spelling words, a photo of a spelling worksheet, or raw text.
Return ONLY the words segmented into syllables using hyphens, one word per line, inside a single plain text code block.
For words where text-to-speech might mispronounce isolated syllables, you may optionally append phonetic pronunciation in parentheses: e.g. "pret-ty (prit-tee)".
No numbers, no explanations, no markdown or punctuation other than hyphens and optional phonetic parentheses.

Example output:
lov-ing
joy-ful
pret-ty (prit-tee)
hand-some (hand-sum)
kit-ten
pup-py`;

/** "Advanced" toggle that reveals the copy-able AI prompt for bigger lists. */
export default function AiPromptCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = AI_PROMPT_TEMPLATE;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <button type="button" className="btn-secondary-sm" onClick={() => setOpen(o => !o)}
        aria-expanded={open} aria-controls="import-advanced" style={{ fontWeight: 700 }}>
        {open ? '▲ Advanced' : '▼ Advanced'}
      </button>
      {open && (
        <div id="import-advanced" style={{
          backgroundColor: 'var(--muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem',
          border: '1px solid var(--card-border)',
          marginTop: '0.6rem'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)' }}>🪄 AI Prompt Generator</span>
            <button type="button" onClick={copy} className="btn-secondary-sm"
              style={{ color: copied ? 'var(--selected-color-border)' : 'var(--foreground)', fontWeight: 700, fontSize: '0.75rem' }}>
              {copied ? '✓ Copied!' : 'Copy AI Prompt'}
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
      )}
    </div>
  );
}

/** The hint that points to the Advanced prompt. */
export function BiggerListNote() {
  return (
    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>
      💡 Bigger list? Use <strong>Advanced → Copy AI prompt</strong> with any AI tool, then paste the result below.
    </p>
  );
}
