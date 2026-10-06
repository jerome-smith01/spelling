import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWordList } from '../hooks/useWordList';
import { useHiding } from '../hooks/useHiding';
import { useDeckSchedule } from '../hooks/useDeckSchedule';
import { useSpeech } from '../hooks/useSpeech';
import WordList from '../components/WordList';
import WordCardDeck from '../components/WordCardDeck';
import DeckSettings from '../components/DeckSettings';
import HideControls from '../components/HideControls';
import ColorPicker from '../components/ColorPicker';
import ImportSection from '../components/ImportSection';
import WordListManager from '../components/WordListManager';
import NotFoundPage from './NotFoundPage';
import { useLists } from '../hooks/useLists';
import { enqueue } from '../services/attemptQueue';
import { saveLastListId } from '../services/storageService';
import { usePageTitle } from '../hooks/usePageTitle';
import { useStruggle } from '../hooks/useStruggle';
import '../styles/spelling.css';

// Rate (how slowly each syllable is spoken) and pause (the gap between syllables)
// are independent controls — a user must be able to slow speech down without
// changing the pause, and vice versa.
const RATE_PRESETS = {
  normal: 0.80,
  slow: 0.65,
  slowest: 0.5
};

const PAUSE_PRESETS = {
  short: 400,
  medium: 650,
  long: 900
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

  // One visit to a list = one practice session. Scoring uses the LAST answer per
  // letter within a session, so a corrected miss counts as correct.
  const sessionId = useRef(crypto.randomUUID());
  const frictionByWord = useStruggle();

  const handleAttempts = (word, attempts) => {
    if (!VALID_WORD.test(word)) return;
    enqueue(attempts.map(a => ({ word, ...a, session_id: sessionId.current, list_id: listId })));
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

  const schedule = useDeckSchedule(listId, words.map(w => w.word));
  const isGrid = schedule.prefs.view === 'grid';
  const { speak, speakSyllables, activePlayback } = useSpeech();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isImportExpanded, setIsImportExpanded] = useState(false);
  const [ratePreset, setRatePreset] = useState(() => {
    try {
      return localStorage.getItem('spelling_tutor_rate_preset_v1') || 'normal';
    } catch {
      return 'normal';
    }
  });
  const [pausePreset, setPausePreset] = useState(() => {
    try {
      return localStorage.getItem('spelling_tutor_pause_preset_v1') || 'short';
    } catch {
      return 'short';
    }
  });

  const handleRatePresetChange = (preset) => {
    setRatePreset(preset);
    try {
      localStorage.setItem('spelling_tutor_rate_preset_v1', preset);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  const handlePausePresetChange = (preset) => {
    setPausePreset(preset);
    try {
      localStorage.setItem('spelling_tutor_pause_preset_v1', preset);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  const handleSpeakSyllables = (wordId, syllableTexts) => {
    const rate = RATE_PRESETS[ratePreset] ?? RATE_PRESETS.normal;
    const pauseDurationMs = PAUSE_PRESETS[pausePreset] ?? PAUSE_PRESETS.short;
    speakSyllables(wordId, syllableTexts, { rate, pauseDurationMs });
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
        <div style={{ marginBottom: settingsOpen ? '0.9rem' : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <WordListManager listId={listId} />
          <button
            type="button"
            onClick={() => setSettingsOpen(prev => !prev)}
            className="btn-secondary-sm"
            style={{ fontWeight: 700 }}
            aria-expanded={settingsOpen}
            aria-controls="practice-settings"
          >
            {settingsOpen ? '▲ Settings' : '⚙ Settings'}
          </button>
        </div>

        {settingsOpen && (
        <div id="practice-settings" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <DeckSettings
          prefs={schedule.prefs}
          setPrefs={schedule.setPrefs}
          testDate={schedule.testDate}
          setTestDate={schedule.setTestDate}
          today={schedule.today}
          onReset={schedule.resetProgress}
        />

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
            {isGrid && (
              <>
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
              </>
            )}
            <ColorPicker />
            <div style={{
              height: '1.5rem',
              width: '1px',
              backgroundColor: 'var(--card-border)'
            }} />
            {/* Syllable Rate Preset Dropdown — independent of pause length */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label
                htmlFor="syllable-rate-select"
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
                <span>🐢</span> Speed:
              </label>
              <select
                id="syllable-rate-select"
                value={ratePreset}
                onChange={(e) => handleRatePresetChange(e.target.value)}
                className="speed-preset-select"
                aria-label="Syllable pronunciation speed"
              >
                <option value="normal">Normal</option>
                <option value="slow">Slow</option>
                <option value="slowest">Slowest</option>
              </select>
            </div>

            {/* Syllable Pause Preset Dropdown — independent of speech rate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label
                htmlFor="syllable-pause-select"
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
                <span>⏸️</span> Pause:
              </label>
              <select
                id="syllable-pause-select"
                value={pausePreset}
                onChange={(e) => handlePausePresetChange(e.target.value)}
                className="speed-preset-select"
                aria-label="Pause between syllables"
              >
                <option value="short">Short (0.4s)</option>
                <option value="medium">Medium (0.65s)</option>
                <option value="long">Long (0.9s)</option>
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
        </div>
        )}
      </section>

      {/* Main Words Grid */}
      {isGrid ? (
        <WordList
          words={words}
          hiddenMap={hiddenMap}
          onHideWord={hideNextLettersForWord}
          onShowWord={showAllLettersForWord}
          onSpeak={speak}
          onSpeakSyllables={handleSpeakSyllables}
          activePlayback={activePlayback}
          onAttempts={handleAttempts}
          frictionByWord={frictionByWord}
        />
      ) : (
        <WordCardDeck
          words={words}
          schedule={schedule}
          onSpeak={speak}
          onSpeakSyllables={handleSpeakSyllables}
          activePlayback={activePlayback}
          onAttempts={handleAttempts}
          frictionByWord={frictionByWord}
        />
      )}
    </div>
  );
}
