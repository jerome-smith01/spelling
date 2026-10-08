import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWordList, parseWordList } from '../hooks/useWordList';
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
import { useStrugglePositions } from '../hooks/useStrugglePositions';
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
  const [searchParams] = useSearchParams();
  const { rawList, words, list, importWords, resetToDefault } = useWordList(listId);
  const { createList, atListLimit } = useLists();
  usePageTitle(list ? `${list.name} — Practice` : 'Practice');

  useEffect(() => {
    saveLastListId(listId);
  }, [listId]);

  // One visit to a list = one practice session. Scoring uses the LAST answer per
  // letter within a session, so a corrected miss counts as correct.
  const sessionId = useRef(crypto.randomUUID());
  const frictionByWord = useStruggle();
  const struggleByWord = useStrugglePositions(list?.focusGroups?.length ? words.map(w => w.word) : []);

  const handleAttempts = (word, attempts) => {
    if (!VALID_WORD.test(word)) return;
    enqueue(attempts.map(a => ({ word, ...a, session_id: sessionId.current, list_id: listId })));
  };

  const handleImport = (text, extra) => {
    const result = importWords(text, extra);
    // Editing the built-in default creates a real list with its own URL
    if (result.success && result.listId !== listId) navigate(`/lists/${result.listId}`, { replace: true });
    return result;
  };
  // Photo import makes a brand-new list and opens it
  const handleCreateList = ({ name, wordsRaw, focusGroups, hints }) => {
    if (atListLimit) return { success: false, error: 'You have reached the list limit. Delete a list first.' };
    if (parseWordList(wordsRaw).length === 0) return { success: false, error: 'Add at least one word.' };
    if (new TextEncoder().encode(wordsRaw).length > 20 * 1024) return { success: false, error: 'That list is too long (20 KB maximum).' };
    const id = createList(name, wordsRaw.trim(), { focusGroups, hints });
    setIsImportExpanded(false);
    navigate(`/lists/${id}`);
    return { success: true };
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
    <div className="practice-immersive">
    <div className="practice-inner">
      {/* Top bar: back to the dashboard, deck name, settings */}
      <div className="practice-top" role="region" aria-label="Spelling Practice Controls">
        <Link to="/" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700 }}>← Decks</Link>
        <h2
          tabIndex={-1}
          style={{
            margin: 0,
            fontSize: '1.15rem',
            fontWeight: 800,
            color: 'var(--foreground)',
            overflowWrap: 'anywhere',
            textAlign: 'center',
            flex: 1
          }}
        >
          {list?.name}
        </h2>
        <button
          type="button"
          onClick={() => setSettingsOpen(prev => !prev)}
          className="btn-secondary-sm"
          style={{ fontWeight: 700 }}
          aria-expanded={settingsOpen}
          aria-controls="practice-settings"
          data-tutorial="settings-button"
        >
          {settingsOpen ? '▲ Settings' : '⚙ Settings'}
        </button>
      </div>

      {settingsOpen && (
      <section aria-label="Practice settings" style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem'
      }}>
        <WordListManager listId={listId} />
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
          currentFocus={list?.focusGroups ?? []}
          onImport={handleImport}
          onCreateList={handleCreateList}
          onResetDefault={resetToDefault}
        />
        </div>
      </section>
      )}

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
          focusGroups={list?.focusGroups ?? []}
          hints={list?.hints ?? []}
          struggleByWord={struggleByWord}
          initialMode={searchParams.get('mode') === 'quiz' ? 'quiz' : 'practice'}
        />
      )}
    </div>
    </div>
  );
}
