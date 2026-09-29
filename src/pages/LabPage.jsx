import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { canAccessLab } from '../utils/labAccess';
import { parseWordList } from '../utils/wordParser';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import { API_ORIGIN } from '../services/apiService';
import NotFoundPage from './NotFoundPage';

// Same shape as PracticePage's speed/pause presets, reused here so "slow" and "short
// pause" mean roughly the same thing whether you're comparing speechSynthesis or these
// server-generated voices.
const RATE_PRESETS = { normal: 1.0, slow: 0.75, slowest: 0.6 };
const PAUSE_PRESETS = { none: 0, short: 400, medium: 650, long: 900 };

const RATE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
  { value: 'slowest', label: 'Slowest' }
];

const PAUSE_OPTIONS = [
  { value: 'none', label: 'None (0s)' },
  { value: 'short', label: 'Short (0.4s)' },
  { value: 'medium', label: 'Medium (0.65s)' },
  { value: 'long', label: 'Long (0.9s)' }
];

function RadioGroup({ legend, name, options, value, onChange }) {
  return (
    <fieldset style={{ border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.4rem 0.75rem 0.6rem' }}>
      <legend style={{ fontSize: '0.8rem', padding: '0 0.25rem' }}>{legend}</legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const DEFAULT_WORDS = [
  'con-trol', 'speak-er', 'pen-cil', 'bounce', 'knee',
  'write', 'lamb', 'hop-ping', 'bird', 'cas-tle'
];

// The 40 Deepgram Aura-2 voices (see docs/architecture/06_tts_decision.md), plus MeloTTS
// as its own single-voice row.
const AURA2_VOICES = [
  'amalthea', 'andromeda', 'apollo', 'arcas', 'aries', 'asteria', 'athena', 'atlas',
  'aurora', 'callista', 'cora', 'cordelia', 'delia', 'draco', 'electra', 'harmonia',
  'helena', 'hera', 'hermes', 'hyperion', 'iris', 'janus', 'juno', 'jupiter', 'luna',
  'mars', 'minerva', 'neptune', 'odysseus', 'ophelia', 'orion', 'orpheus', 'pandora',
  'phoebe', 'pluto', 'saturn', 'thalia', 'theia', 'vesta', 'zeus'
];

const VOICE_ROWS = [
  { key: 'melotts', provider: 'melotts', speaker: null, label: 'MeloTTS (default voice)' },
  ...AURA2_VOICES.map(name => ({ key: `aura2-${name}`, provider: 'aura2', speaker: name, label: `Aura-2 — ${name}` }))
];

async function fetchWordAudio(word, provider, speaker) {
  const res = await fetch(`${API_ORIGIN}/api/spelling/lab/tts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, provider, speaker }),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json())?.error || message; } catch { /* non-JSON */ }
    throw new Error(message);
  }
  return URL.createObjectURL(await res.blob());
}

export default function LabPage() {
  const { user } = useAuth();
  const [selectedWord, setSelectedWord] = useState(DEFAULT_WORDS[0]);
  const [customWords, setCustomWords] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [ratePreset, setRatePreset] = useState('normal');
  const [pausePreset, setPausePreset] = useState('short');
  const [rowStatus, setRowStatus] = useState({}); // key -> 'playing' | 'error message' | undefined
  const cancelRef = useRef(0);

  const allWords = useMemo(() => [...DEFAULT_WORDS, ...customWords], [customWords]);

  const syllables = useMemo(() => {
    const [word] = parseWordList(selectedWord);
    return word ? buildPronunciationSyllables(word) : [];
  }, [selectedWord]);

  const handleAddCustomWord = (e) => {
    e.preventDefault();
    const raw = customInput.trim().toLowerCase();
    if (!raw) return;
    if (!allWords.includes(raw)) setCustomWords(prev => [...prev, raw]);
    setSelectedWord(raw);
    setCustomInput('');
  };

  const playRow = useCallback(async (row) => {
    const runId = ++cancelRef.current;
    const rate = RATE_PRESETS[ratePreset] ?? RATE_PRESETS.normal;
    const pauseMs = PAUSE_PRESETS[pausePreset] ?? PAUSE_PRESETS.short;

    setRowStatus(prev => ({ ...prev, [row.key]: 'playing' }));
    try {
      for (let i = 0; i < syllables.length; i++) {
        if (cancelRef.current !== runId) return; // a newer play request took over
        const url = await fetchWordAudio(syllables[i], row.provider, row.speaker || undefined);
        if (cancelRef.current !== runId) return;

        await new Promise((resolve, reject) => {
          const audio = new Audio(url);
          audio.playbackRate = rate;
          audio.onended = resolve;
          audio.onerror = () => reject(new Error('Playback failed'));
          audio.play().catch(reject);
        });

        if (i < syllables.length - 1 && cancelRef.current === runId) {
          await new Promise(resolve => setTimeout(resolve, pauseMs));
        }
      }
      if (cancelRef.current === runId) {
        setRowStatus(prev => ({ ...prev, [row.key]: undefined }));
      }
    } catch (err) {
      if (cancelRef.current === runId) {
        setRowStatus(prev => ({ ...prev, [row.key]: err.message || 'Error' }));
      }
    }
  }, [syllables, ratePreset, pausePreset]);

  if (!canAccessLab(user)) return <NotFoundPage />;

  return (
    <div>
      <h2 tabIndex={-1}>🧪 Voice Lab</h2>
      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>
        Temporary testing page for Phase 7 (see <code>docs/architecture/06_tts_decision.md</code>) — will be removed
        once a voice is chosen. Each row synthesizes the selected word's pronunciation syllables and plays them back
        to back, same as the app's normal syllable playback.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start', margin: '1rem 0' }}>
        <RadioGroup
          legend="Word"
          name="lab-word-select"
          options={allWords.map(w => ({ value: w, label: w }))}
          value={selectedWord}
          onChange={setSelectedWord}
        />

        <form onSubmit={handleAddCustomWord} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="lab-custom-word" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              Add a word (hyphenated, e.g. pup-py)
            </label>
            <input
              id="lab-custom-word"
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="pup-py"
            />
          </div>
          <button type="submit">Add</button>
        </form>

        <RadioGroup
          legend="🐢 Speed"
          name="lab-rate-select"
          options={RATE_OPTIONS}
          value={ratePreset}
          onChange={setRatePreset}
        />

        <RadioGroup
          legend="⏸️ Pause between syllables"
          name="lab-pause-select"
          options={PAUSE_OPTIONS}
          value={pausePreset}
          onChange={setPausePreset}
        />
      </div>

      <p style={{ fontSize: '0.85rem' }}>
        Speaking as syllables: <strong>{syllables.join(' – ') || '—'}</strong>
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
            <th style={{ padding: '0.5rem' }}>Voice</th>
            <th style={{ padding: '0.5rem' }}></th>
            <th style={{ padding: '0.5rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {VOICE_ROWS.map(row => (
            <tr key={row.key} style={{ borderBottom: '1px solid var(--card-border)' }}>
              <td style={{ padding: '0.5rem' }}>{row.label}</td>
              <td style={{ padding: '0.5rem' }}>
                <button type="button" onClick={() => playRow(row)}>▶ Play</button>
              </td>
              <td style={{ padding: '0.5rem', fontSize: '0.8rem', color: rowStatus[row.key] === 'playing' ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                {rowStatus[row.key] === 'playing' ? 'Playing…' : (rowStatus[row.key] || '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
