import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchLabAudio } from '../services/apiService';
import { isLabUser } from '../utils/labAccess';
import { parseWordList } from '../utils/wordParser';
import { buildPronunciationSyllables } from '../utils/syllablePhonetics';
import NotFoundPage from './NotFoundPage';
import { usePageTitle } from '../hooks/usePageTitle';

// Same hyphenation format PracticePage word lists use — the auto-phonetic
// rules in syllablePhonetics.js correct "-er" and "-tle" automatically, so
// no explicit (parens) overrides are needed for these.
const TEST_WORDS_RAW = `control
speak-er
pen-cil
bounce
knee
write
lamb
hop-ping
bird
cas-tle`;

// MeloTTS works today via the AI binding. Aura-2 voice names below are
// placeholders — confirm the exact model IDs against Deepgram's docs once
// DEEPGRAM_API_KEY is added; until then these cells will show "not configured".
const VOICES = [
  { id: 'melotts', label: 'MeloTTS (Workers AI)' },
  { id: 'aura-2-thalia-en', label: 'Aura-2 — Thalia' },
  { id: 'aura-2-luna-en', label: 'Aura-2 — Luna' },
  { id: 'aura-2-orion-en', label: 'Aura-2 — Orion' },
  { id: 'aura-2-arcas-en', label: 'Aura-2 — Arcas' }
];

// Mirrors PracticePage.jsx's RATE_PRESETS / PAUSE_PRESETS — duplicated here
// rather than shared, since this is a throwaway comparison page.
const RATE_PRESETS = { normal: 0.80, slow: 0.65, slowest: 0.5 };
const PAUSE_PRESETS = { short: 400, medium: 650, long: 900 };

const VALID_CUSTOM_WORD = /^[a-z][a-z' -]{0,39}$/i;

export default function LabPage() {
  const { status, user } = useAuth();
  usePageTitle('TTS Voice Lab');

  if (status === 'loading') return null;
  if (!isLabUser(user?.email)) return <NotFoundPage />;

  return <LabView />;
}

function LabView() {
  const [customWord, setCustomWord] = useState('');
  const [words, setWords] = useState(() => parseWordList(TEST_WORDS_RAW));
  const [ratePreset, setRatePreset] = useState('normal');
  const [pausePreset, setPausePreset] = useState('short');
  const [cellState, setCellState] = useState({}); // key -> 'loading' | 'error' | undefined
  const [nowPlayingKey, setNowPlayingKey] = useState(null);

  const audioCache = useRef(new Map()); // "voice|text" -> object URL
  const stopRef = useRef(() => {});

  const addCustomWord = (e) => {
    e.preventDefault();
    const trimmed = customWord.trim().toLowerCase();
    if (!trimmed || !VALID_CUSTOM_WORD.test(trimmed)) return;
    const [parsed] = parseWordList(trimmed);
    if (!parsed) return;
    setWords(prev => (prev.some(w => w.word === parsed.word) ? prev : [...prev, parsed]));
    setCustomWord('');
  };

  const getAudioUrl = async (voice, text) => {
    const key = `${voice}|${text}`;
    if (audioCache.current.has(key)) return audioCache.current.get(key);
    const url = await fetchLabAudio(text, voice);
    audioCache.current.set(key, url);
    return url;
  };

  const stopPlayback = () => {
    stopRef.current();
    stopRef.current = () => {};
    setNowPlayingKey(null);
  };

  const playClip = (url, rate) => new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    stopRef.current = () => { audio.pause(); resolve(); };
    audio.onended = resolve;
    audio.onerror = () => reject(new Error('Playback failed'));
    audio.play().catch(reject);
  });

  const playWord = async (voice, word) => {
    stopPlayback();
    const rowKey = `word|${voice}|${word.word}`;
    setNowPlayingKey(rowKey);
    setCellState(s => ({ ...s, [rowKey]: 'loading' }));
    try {
      const url = await getAudioUrl(voice, word.word);
      setCellState(s => ({ ...s, [rowKey]: undefined }));
      await playClip(url, RATE_PRESETS[ratePreset]);
    } catch {
      setCellState(s => ({ ...s, [rowKey]: 'error' }));
    } finally {
      setNowPlayingKey(k => (k === rowKey ? null : k));
    }
  };

  const playSyllables = async (voice, word) => {
    stopPlayback();
    const rowKey = `syl|${voice}|${word.word}`;
    setNowPlayingKey(rowKey);
    setCellState(s => ({ ...s, [rowKey]: 'loading' }));
    try {
      const syllableTexts = buildPronunciationSyllables(word);
      const urls = [];
      for (const text of syllableTexts) urls.push(await getAudioUrl(voice, text));
      setCellState(s => ({ ...s, [rowKey]: undefined }));
      for (let i = 0; i < urls.length; i++) {
        await playClip(urls[i], RATE_PRESETS[ratePreset]);
        if (i < urls.length - 1) {
          await new Promise(resolve => {
            const t = setTimeout(resolve, PAUSE_PRESETS[pausePreset]);
            stopRef.current = () => { clearTimeout(t); resolve(); };
          });
        }
      }
    } catch {
      setCellState(s => ({ ...s, [rowKey]: 'error' }));
    } finally {
      setNowPlayingKey(k => (k === rowKey ? null : k));
    }
  };

  const cellButtonStyle = (active) => ({
    padding: '0.3rem 0.6rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--card-border)',
    backgroundColor: active ? 'var(--card-bg)' : 'transparent',
    color: 'var(--foreground)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    marginRight: '0.35rem'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div>
        <h2 tabIndex={-1} style={{ margin: '0 0 0.25rem' }}>TTS Voice Lab</h2>
        <p style={{ color: 'var(--muted-foreground)', margin: 0, fontSize: '0.875rem' }}>
          Phase 7 follow-up: side-by-side comparison of Aura-2 voices and MeloTTS, whole-word
          and syllable-by-syllable (pronunciation-corrected). Temporary page — not linked from the main nav.
        </p>
      </div>

      <form onSubmit={addCustomWord} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={customWord}
          onChange={(e) => setCustomWord(e.target.value)}
          placeholder="Type a word to add…"
          aria-label="Add a custom word to compare"
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)'
          }}
        />
        <button type="submit" className="btn-secondary-sm">Add word</button>
      </form>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          🐢 Speed:
          <select value={ratePreset} onChange={(e) => setRatePreset(e.target.value)} className="speed-preset-select">
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
            <option value="slowest">Slowest</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          ⏸️ Pause:
          <select value={pausePreset} onChange={(e) => setPausePreset(e.target.value)} className="speed-preset-select">
            <option value="short">Short (0.4s)</option>
            <option value="medium">Medium (0.65s)</option>
            <option value="long">Long (0.9s)</option>
          </select>
        </label>
        {nowPlayingKey && (
          <button type="button" className="btn-secondary-sm" onClick={stopPlayback}>Stop</button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>Voice</th>
              {words.map(word => (
                <th key={word.word} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
                  {word.word}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VOICES.map(voice => (
              <tr key={voice.id}>
                <td style={{ padding: '0.5rem', fontWeight: 600, borderBottom: '1px solid var(--card-border)' }}>
                  {voice.label}
                </td>
                {words.map(word => {
                  const wordKey = `word|${voice.id}|${word.word}`;
                  const sylKey = `syl|${voice.id}|${word.word}`;
                  const hasSyllables = word.syllables.length > 1;
                  return (
                    <td key={word.word} style={{ padding: '0.5rem', borderBottom: '1px solid var(--card-border)' }}>
                      <button
                        type="button"
                        style={cellButtonStyle(nowPlayingKey === wordKey)}
                        onClick={() => playWord(voice.id, word)}
                      >
                        {cellState[wordKey] === 'loading' ? '…' : '▶︎ word'}
                      </button>
                      {hasSyllables && (
                        <button
                          type="button"
                          style={cellButtonStyle(nowPlayingKey === sylKey)}
                          onClick={() => playSyllables(voice.id, word)}
                        >
                          {cellState[sylKey] === 'loading' ? '…' : '▶︎ syllables'}
                        </button>
                      )}
                      {(cellState[wordKey] === 'error' || cellState[sylKey] === 'error') && (
                        <span style={{ color: 'var(--danger, #ef4444)', fontSize: '0.7rem' }}>failed</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
