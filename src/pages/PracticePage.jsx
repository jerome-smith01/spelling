import React, { useState } from 'react';
import { useWordList } from '../hooks/useWordList';
import { useHiding } from '../hooks/useHiding';
import { useSpeech } from '../hooks/useSpeech';
import WordList from '../components/WordList';
import HideControls from '../components/HideControls';
import ColorPicker from '../components/ColorPicker';
import ImportSection from '../components/ImportSection';
import '../styles/spelling.css';

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

  const { speak } = useSpeech();
  const [isImportExpanded, setIsImportExpanded] = useState(false);

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
      />
    </div>
  );
}
