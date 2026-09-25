import React from 'react';
import WordCard from './WordCard';

export default function WordList({
  words,
  hiddenMap,
  onHideWord,
  onShowWord,
  onSpeak,
  onSpeakSyllables,
  activePlayback
}) {
  if (!words || words.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)',
        color: 'var(--muted-foreground)'
      }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          No spelling words available.
        </p>
        <p style={{ fontSize: '0.9rem' }}>
          Click "Import List" to paste or generate words.
        </p>
      </div>
    );
  }

  return (
    <div className="spelling-grid">
      {words.map((word) => (
        <WordCard
          key={word.id}
          word={word}
          hiddenIndices={hiddenMap[word.id] || new Set()}
          onHide={onHideWord}
          onShow={onShowWord}
          onSpeak={onSpeak}
          onSpeakSyllables={onSpeakSyllables}
          activePlayback={activePlayback}
        />
      ))}
    </div>
  );
}
