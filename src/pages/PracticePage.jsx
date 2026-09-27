import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWordList } from '../hooks/useWordList';
import { useHiding } from '../hooks/useHiding';
import { useSpeech } from '../hooks/useSpeech';
import WordList from '../components/WordList';
import HideControls from '../components/HideControls';
import ColorPicker from '../components/ColorPicker';
import ImportSection from '../components/ImportSection';
import WordListManager from '../components/WordListManager';
import NotFoundPage from './NotFoundPage';
import { useLists } from '../hooks/useLists';
import { enqueue } from '../services/attemptQueue';
import { saveLastListId } from '../services/storageService';
import { usePageTitle } from '../hooks/usePageTitle';
import '../styles/spelling.css';

const SPEED_CONFIGS = {
  normal: { rate: 0.80, pauseDurationMs: 400 },
  slower: { rate: 0.70, pauseDurationMs: 650 },
  slowest: { rate: 0.60, pauseDurationMs: 900 }
};

// Server-side validation is /^[a-z][a-z' -]{0,39}$/; skip anything it would reject
const VALID_WORD = /^[a-z][a-z' -]{0,39}$/;

/** Route: /lists/:listId — resolves the list (local first, then account) and renders it. */
export default function PracticePage() {
  const { listId } = useParams();
  const { getList, ready } = useLists();
  const list = getList(listId);

  if (!list) {
    if (!ready) return <p role="status" style={{ color: 'var(--muted-foreground)' }}>Loading your lists…</p>;
    return (
      <NotFoundPage
        title="List not found"
        message="This list doesn't exist, or it belongs to a different account or device."
      />
    );
  }
  return <PracticeView key={listId} listId={listId} />;
}

function PracticeView({ listId }) {
  const navigate = useNavigate();
  const { rawList, words, list, importWords, resetToDefault } = useWordList(listId);
  usePageTitle(list ? `${list.name} — Practice` : 'Practice');

  useEffect(() => {
    saveLastListId(listId);
  }, [listId]);

  const handleAttempts = (word, attempts) => {
    if (!VALID_WORD.test(word)) return;
    enqueue(attempts.map(a => ({ word, ...a })));
  };

  const handleImport = (text) => {
    const result = importWords(text);
    // Editing the built-in default creates a real list with its own URL
    if (result.success && result.listId !== listId) navigate(`/lists/${result.listId}`, { replace: true });
    return result;
  };
  const {
    denominator,
    setDenominator,
    hiddenMap,
    hideNextLettersForWord,
    showAllLettersForWord,
    hideAllWords,
    showAllWords
  } = useHiding(words, listId);

  const { speak, speakSyllables, activePlayback } = useSpeech();
  const [isImportExpanded, setIsImportExpanded] = useState(false);
  const [speedPreset, setSpeedPreset] = useState(() => {
    try {
      return localStorage.getItem('spelling_tutor_speed_preset_v1') || 'normal';
    } catch {
      return 'normal';
    }
  });

  const handleSpeedPresetChange = (preset) => {
    setSpeedPreset(preset);
    try {
      localStorage.setItem('spelling_tutor_speed_preset_v1', preset);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  const handleSpeakSyllables = (wordId, syllableTexts) => {
    const config = SPEED_CONFIGS[speedPreset] || SPEED_CONFIGS.normal;
    speakSyllables(wordId, syllableTexts, config);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '1024px',
      margin: '0 auto'
    }}>
      {/* Current list title */}
      <h2
        tabIndex={-1}
        style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--foreground)',
          overflowWrap: 'anywhere'
        }}
      >
        {list?.name}
      </h2>

      {/* Top Toolbar: Expandable Spelling Practice Controls */}
      <section style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1rem 1.25rem',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }} aria-label="Spelling Practice Controls">
        {/* List selector (each list has its own URL) */}
        <div style={{ marginBottom: '0.9rem' }}>
          <WordListManager listId={listId} />
        </div>

        {/* Main Controls Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap'
          }}>
            <HideControls
              denominator={denominator}
              onDenominatorChange={setDenominator}
              onHideAll={hideAllWords}
              onShowAll={showAllWords}
            />
            <div style={{
              height: '1.5rem',
              width: '1px',
              backgroundColor: 'var(--card-border)'
            }} />
            <ColorPicker />
            <div style={{
              height: '1.5rem',
              width: '1px',
              backgroundColor: 'var(--card-border)'
            }} />
            {/* Syllable Speed Preset Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label
                htmlFor="syllable-speed-select"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <span>🐢</span> Syllables:
              </label>
              <select
                id="syllable-speed-select"
                value={speedPreset}
                onChange={(e) => handleSpeedPresetChange(e.target.value)}
                className="speed-preset-select"
                aria-label="Syllable pronunciation speed preset"
              >
                <option value="normal">Normal (0.4s pause)</option>
                <option value="slower">Slower (0.65s pause)</option>
                <option value="slowest">Slowest (0.9s pause)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontSize: '0.85rem',
              color: 'var(--muted-foreground)',
              fontWeight: 600
            }}>
              {words.length} {words.length === 1 ? 'word' : 'words'}
            </span>
            <button
              type="button"
              onClick={() => setIsImportExpanded(prev => !prev)}
              className="btn-secondary-sm"
              style={{
                fontWeight: 700,
                backgroundColor: isImportExpanded ? 'var(--card-border)' : 'var(--muted)'
              }}
              aria-expanded={isImportExpanded}
            >
              {isImportExpanded ? '▲ Close Import' : '▼ Import Words'}
            </button>
          </div>
        </div>

        {/* Expandable Import Section */}
        <ImportSection
          isExpanded={isImportExpanded}
          onClose={() => setIsImportExpanded(false)}
          currentRaw={rawList}
          onImport={handleImport}
          onResetDefault={resetToDefault}
        />
      </section>

      {/* Main Words Grid */}
      <WordList
        words={words}
        hiddenMap={hiddenMap}
        onHideWord={hideNextLettersForWord}
        onShowWord={showAllLettersForWord}
        onSpeak={speak}
        onSpeakSyllables={handleSpeakSyllables}
        activePlayback={activePlayback}
        onAttempts={handleAttempts}
      />
    </div>
  );
}
