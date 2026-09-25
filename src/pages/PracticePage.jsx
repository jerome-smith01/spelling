import React, { useState } from 'react';
import { useWordList } from '../hooks/useWordList';
import { useHiding } from '../hooks/useHiding';
import { useSpeech } from '../hooks/useSpeech';
import WordList from '../components/WordList';
import HideControls from '../components/HideControls';
import ColorPicker from '../components/ColorPicker';
import ImportSection from '../components/ImportSection';
import '../styles/spelling.css';

const SPEED_CONFIGS = {
  normal: { rate: 0.80, pauseDurationMs: 400 },
  slower: { rate: 0.70, pauseDurationMs: 650 },
  slowest: { rate: 0.60, pauseDurationMs: 900 }
};

export default function PracticePage() {
  const { rawList, words, importWords, resetToDefault } = useWordList();
  const {
    denominator,
    setDenominator,
    hiddenMap,
    hideNextLettersForWord,
    showAllLettersForWord,
    hideAllWords,
    showAllWords
  } = useHiding(words);

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
          onImport={importWords}
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
      />
    </div>
  );
}
