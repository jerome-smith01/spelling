import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWordList, parseWordList } from '../hooks/useWordList';
import { useHiding } from '../hooks/useHiding';
import { useDeckSchedule } from '../hooks/useDeckSchedule';
import { useSpeech } from '../hooks/useSpeech';
import WordList from '../components/WordList';
import WordTable from '../components/WordTable';
import WordCardDeck from '../components/WordCardDeck';
import { learnerKey } from '../services/activeLearner';
import DeckSettings from '../components/DeckSettings';
import { SpeedSlowestIcon, SpeedSlowIcon, SpeedNormalIcon } from '../components/SpeedIcons';
import { PauseShortIcon, PauseMediumIcon, PauseLongIcon } from '../components/TimerIcons';
import HideControls from '../components/HideControls';
import ColorPicker from '../components/ColorPicker';
import ImportSection from '../components/ImportSection';
import WordListManager, { DeleteListButton } from '../components/WordListManager';
import NotFoundPage from './NotFoundPage';
import { useLists } from '../hooks/useLists';
import { enqueue } from '../services/attemptQueue';
import { saveLastListId } from '../services/storageService';
import { usePageTitle } from '../hooks/usePageTitle';
import { useStruggle } from '../hooks/useStruggle';
import { useStrugglePositions } from '../hooks/useStrugglePositions';
import { useLearner } from '../hooks/useLearner';
import { fetchStages, pushStages } from '../services/progressSync';
import { stagesOf } from '../utils/schedule';
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
  const { kidMode } = useLearner();
  const [searchParams, setSearchParams] = useSearchParams();
  const { rawList, words, list, importWords, resetToDefault } = useWordList(listId);
  const { createList, atListLimit, assignmentFor, refreshAssigned } = useLists();
  const assignment = assignmentFor?.(listId);   // this list was assigned to whoever is practicing
  usePageTitle(list ? `${list.name} — Practice` : 'Practice');

  useEffect(() => {
    saveLastListId(listId);
  }, [listId]);

  // One visit to a list = one practice session. Scoring counts every miss per letter
  // within a session, so a letter missed again and again scores as a struggle.
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

  const schedule = useDeckSchedule(listId, words.map(w => w.word), { strict: !!assignment });

  // An assigned list is done when every word has passed every stage: report the stages as they change here
  // (the latest report counts, so progress can go down), and start words this device has not seen where the
  // server has them. Nothing is sent just for opening the page, so a stale device cannot overwrite newer progress.
  const assigned = !!assignment;
  const stagesRef = useRef(null);
  const unsentRef = useRef(false);
  const baseline = useRef(schedule.progress);     // progress as it was on open, or right after the server's stages were carried in
  const seeding = useRef(false);
  stagesRef.current = schedule.progress;
  useEffect(() => {
    if (!assigned) return undefined;
    let cancelled = false;
    fetchStages(listId).then(r => {
      if (cancelled || !r?.words) return;
      if (schedule.mergeRemote(r.words)) seeding.current = true;   // this change came from the server: do not send it back
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, assigned]);
  useEffect(() => {
    if (!assigned) return undefined;
    if (seeding.current) { seeding.current = false; baseline.current = schedule.progress; return undefined; }
    if (baseline.current === schedule.progress) return undefined;   // nothing has changed on this device yet
    unsentRef.current = true;
    const t = setTimeout(async () => {
      try {
        await pushStages(listId, stagesOf(schedule.progress));
        unsentRef.current = false;
        refreshAssigned?.();
      } catch { /* offline: the next change sends it */ }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.progress, listId, assigned]);
  // Leaving the page within the delay must not lose the last answers
  useEffect(() => () => {
    if (assigned && unsentRef.current) pushStages(listId, stagesOf(stagesRef.current)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId, assigned]);
  const isGrid = schedule.prefs.view === 'grid';
  const isList = schedule.prefs.view === 'list';
  const isWide = isGrid || isList;   // grid and list use the full width; one card at a time uses a 640px column
  const { speak, speakSyllables, speakBoth, activePlayback } = useSpeech();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const limited = kidMode || !!list?.readOnly;   // no deck settings or importing
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

  const handleSpeakBoth = (wordId, wordText, syllableTexts) => {
    const rate = RATE_PRESETS[ratePreset] ?? RATE_PRESETS.normal;
    const pauseDurationMs = PAUSE_PRESETS[pausePreset] ?? PAUSE_PRESETS.short;
    speakBoth(wordId, wordText, syllableTexts, { rate, pauseDurationMs });
  };

  // Rename / Save as / Import: they replace the mode tabs while settings are open
  const listActions = settingsOpen && !limited ? (
    <WordListManager listId={listId} wordCount={words.length}
      importOpen={isImportExpanded} onToggleImport={() => setIsImportExpanded(prev => !prev)} />
  ) : null;

  const settingsPanel = settingsOpen && !limited ? (
    <>
      <section aria-label="Practice settings" style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--selected-color)',
        borderRadius: 'var(--radius-xl)',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem'
      }}>
        <div id="practice-settings" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isImportExpanded ? (
          <ImportSection
            isExpanded={isImportExpanded}
            onClose={() => setIsImportExpanded(false)}
            currentRaw={rawList}
            currentFocus={list?.focusGroups ?? []}
            onImport={handleImport}
            onCreateList={handleCreateList}
            onResetDefault={resetToDefault}
          />
        ) : (
          <>
            <DeckSettings
              prefs={schedule.prefs}
              setPrefs={schedule.setPrefs}
              testDate={schedule.testDate}
              setTestDate={schedule.setTestDate}
              onReset={schedule.resetProgress}
              appearanceControls={<ColorPicker />}
              deleteControl={<DeleteListButton listId={listId} />}
              speechControls={(
                <div className="settings-stack">
                  <div className="settings-field">
                    Syllable speed
                    <div className="view-toggle" role="group" aria-label="Syllable pronunciation speed">
                      {[
                        { value: 'slowest', label: 'Slowest', Icon: SpeedSlowestIcon },
                        { value: 'slow', label: 'Slow', Icon: SpeedSlowIcon },
                        { value: 'normal', label: 'Normal', Icon: SpeedNormalIcon }
                      ].map(({ value, label, Icon }) => (
                        <button key={value} type="button" className="view-toggle-btn"
                          aria-pressed={ratePreset === value}
                          onClick={() => handleRatePresetChange(value)}>
                          <Icon />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="settings-field">
                    Pause between syllables
                    <div className="view-toggle" role="group" aria-label="Pause between syllables">
                      {[
                        { value: 'short', label: 'Short', hint: '0.4s', Icon: PauseShortIcon },
                        { value: 'medium', label: 'Medium', hint: '0.65s', Icon: PauseMediumIcon },
                        { value: 'long', label: 'Long', hint: '0.9s', Icon: PauseLongIcon }
                      ].map(({ value, label, hint, Icon }) => (
                        <button key={value} type="button" className="view-toggle-btn"
                          aria-pressed={pausePreset === value} title={`${label} (${hint})`}
                          onClick={() => handlePausePresetChange(value)}>
                          <Icon />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            />

            {isGrid && (
              <HideControls
                denominator={denominator}
                onDenominatorChange={setDenominator}
                onHideAll={hideAllWords}
                onShowAll={showAllWords}
              />
            )}
          </>
        )}
        </div>
      </section>
    </>
  ) : null;

  // A child (or a student on an assigned list) gets no deck settings or word importing
  const settingsToggle = limited ? null : (
    <button
      type="button"
      onClick={() => setSettingsOpen(prev => !prev)}
      className="btn-secondary-sm settings-toggle"
      aria-expanded={settingsOpen}
      aria-controls="practice-settings"
      data-tutorial="settings-button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
      <span className="settings-toggle-label">Settings</span>
    </button>
  );

  return (
    <div className="practice-immersive">
    <div className="practice-inner">
      {/* Top bar: back to the dashboard, deck name, settings */}
      <div className={`practice-top${isWide ? '' : ' practice-top-deck'}`} role="region" aria-label="Spelling Practice Controls">
        <Link to="/" className="btn-secondary-sm" style={{ textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Decks
        </Link>
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
        {isWide ? settingsToggle : <span />}
      </div>

      {isWide && listActions}
      {isWide && settingsPanel}

      {/* Main Words Grid */}
      {isList ? (
        <WordTable words={words} progress={schedule.progress} today={schedule.today} onSpeak={speak} />
      ) : isGrid ? (
        <WordList
          words={words}
          hiddenMap={hiddenMap}
          onHideWord={hideNextLettersForWord}
          onShowWord={showAllLettersForWord}
          onSpeak={speak}
          onSpeakSyllables={handleSpeakSyllables}
          onSpeakBoth={handleSpeakBoth}
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
          onSpeakBoth={handleSpeakBoth}
          activePlayback={activePlayback}
          onAttempts={handleAttempts}
          frictionByWord={frictionByWord}
          focusGroups={list?.focusGroups ?? []}
          hints={list?.hints ?? []}
          struggleByWord={struggleByWord}
          initialMode={searchParams.get('mode') === 'quiz' ? 'quiz' : 'practice'}
          quizStorageKey={learnerKey(`spelling_tutor_quiz_v1:${listId}`)}
          onModeChange={(m) => setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (m === 'quiz') next.set('mode', 'quiz'); else next.delete('mode');
            return next;
          }, { replace: true })}
          dueDate={assignment?.due_at || null}
          keyboardHidden={settingsOpen}
          settingsToggle={settingsToggle}
          settingsOpen={settingsOpen && !limited}
          listActions={listActions}
          settingsPanel={settingsPanel}
        />
      )}
    </div>
    </div>
  );
}
