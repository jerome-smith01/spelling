import { useState, useCallback, useEffect, useRef } from 'react';

export function useSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePlayback, setActivePlayback] = useState({
    wordId: null,
    activeSyllableIndex: null,
    isSlow: false
  });

  const timerRef = useRef(null);
  const activeRunIdRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    // Increment run ID to invalidate any pending asynchronous timeouts/callbacks
    activeRunIdRef.current += 1;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis abort errors
      }
    }

    setIsSpeaking(false);
    setActivePlayback({
      wordId: null,
      activeSyllableIndex: null,
      isSlow: false
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Speaks the full word at normal natural speed
  const speak = useCallback((wordId, wordText) => {
    const textToSpeak = typeof wordText === 'string' ? wordText : (typeof wordId === 'string' ? wordId : '');
    const targetId = wordId || textToSpeak;

    if (!textToSpeak || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // If currently speaking this exact word normally, toggle stop
    if (isSpeaking && activePlayback.wordId === targetId && !activePlayback.isSlow) {
      stop();
      return;
    }

    stop(); // Cancel previous speech
    const currentRunId = activeRunIdRef.current;

    try {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // Natural learning speed
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (activeRunIdRef.current === currentRunId) {
          setIsSpeaking(true);
          setActivePlayback({
            wordId: targetId,
            activeSyllableIndex: null,
            isSlow: false
          });
        }
      };

      utterance.onend = () => {
        if (activeRunIdRef.current === currentRunId) {
          setIsSpeaking(false);
          setActivePlayback({
            wordId: null,
            activeSyllableIndex: null,
            isSlow: false
          });
        }
      };

      utterance.onerror = () => {
        if (activeRunIdRef.current === currentRunId) {
          setIsSpeaking(false);
          setActivePlayback({
            wordId: null,
            activeSyllableIndex: null,
            isSlow: false
          });
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setActivePlayback({ wordId: null, activeSyllableIndex: null, isSlow: false });
    }
  }, [isSpeaking, activePlayback, stop]);

  // Speaks syllables sequentially with distinct pauses and visual synchronization
  const speakSyllables = useCallback((wordId, syllablesArray, options = {}) => {
    if (!syllablesArray || syllablesArray.length === 0 || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Toggle stop if already playing syllables for this word
    if (isSpeaking && activePlayback.wordId === wordId && activePlayback.isSlow) {
      stop();
      return;
    }

    stop();
    const currentRunId = activeRunIdRef.current;
    const { rate = 0.75, pauseDurationMs = 450 } = options;

    const playSyllableAtIndex = (index) => {
      if (activeRunIdRef.current !== currentRunId) return;

      if (index >= syllablesArray.length) {
        setIsSpeaking(false);
        setActivePlayback({ wordId: null, activeSyllableIndex: null, isSlow: false });
        return;
      }

      const syllableText = syllablesArray[index];
      const utterance = new SpeechSynthesisUtterance(syllableText);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (activeRunIdRef.current === currentRunId) {
          setIsSpeaking(true);
          setActivePlayback({
            wordId,
            activeSyllableIndex: index,
            isSlow: true
          });
        }
      };

      utterance.onend = () => {
        if (activeRunIdRef.current !== currentRunId) return;

        const nextIndex = index + 1;
        if (nextIndex < syllablesArray.length) {
          // Pause between syllables while retaining or transitioning state
          timerRef.current = setTimeout(() => {
            if (activeRunIdRef.current === currentRunId) {
              playSyllableAtIndex(nextIndex);
            }
          }, pauseDurationMs);
        } else {
          // All syllables finished
          setIsSpeaking(false);
          setActivePlayback({ wordId: null, activeSyllableIndex: null, isSlow: false });
        }
      };

      utterance.onerror = () => {
        if (activeRunIdRef.current === currentRunId) {
          setIsSpeaking(false);
          setActivePlayback({ wordId: null, activeSyllableIndex: null, isSlow: false });
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    playSyllableAtIndex(0);
  }, [isSpeaking, activePlayback, stop]);

  // Says the word at normal speed, then again slowly, syllable by syllable
  const speakBoth = useCallback((wordId, wordText, syllablesArray, options = {}) => {
    if (!wordText || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking && activePlayback.wordId === wordId) {
      stop();
      return;
    }

    stop();
    const runId = activeRunIdRef.current;
    const { rate = 0.75, pauseDurationMs = 450 } = options;
    const live = () => activeRunIdRef.current === runId;

    const slow = (i) => {
      if (!live()) return;
      if (i >= syllablesArray.length) {
        setIsSpeaking(false);
        setActivePlayback({ wordId: null, activeSyllableIndex: null, isSlow: false });
        return;
      }
      const s = new SpeechSynthesisUtterance(syllablesArray[i]);
      s.lang = 'en-US';
      s.rate = rate;
      s.onstart = () => {
        if (live()) {
          setIsSpeaking(true);
          setActivePlayback({ wordId, activeSyllableIndex: i, isSlow: true });
        }
      };
      s.onend = () => {
        if (!live()) return;
        timerRef.current = setTimeout(() => slow(i + 1), pauseDurationMs);
      };
      s.onerror = () => { if (live()) stop(); };
      window.speechSynthesis.speak(s);
    };

    try {
      const u = new SpeechSynthesisUtterance(wordText);
      u.lang = 'en-US';
      u.rate = 0.85;
      u.onstart = () => {
        if (live()) {
          setIsSpeaking(true);
          setActivePlayback({ wordId, activeSyllableIndex: null, isSlow: false });
        }
      };
      u.onend = () => {
        if (!live()) return;
        if (!syllablesArray || syllablesArray.length === 0) { stop(); return; }
        timerRef.current = setTimeout(() => slow(0), 500);
      };
      u.onerror = () => { if (live()) stop(); };
      window.speechSynthesis.speak(u);
    } catch {
      stop();
    }
  }, [isSpeaking, activePlayback, stop]);

  return {
    speak,
    speakSyllables,
    speakBoth,
    stop,
    isSpeaking,
    isSupported,
    activePlayback
  };
}
