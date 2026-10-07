/**
 * Declarative tutorial steps. `target` is the value of a `data-tutorial` attribute
 * (null = no anchor, centered card). Steps whose target isn't on screen are skipped
 * and stay unseen for a later visit. Each step has its own stable `stepKey`.
 * `position`: 'below' | 'above' | 'center'.
 */
export const TUTORIAL_KEYS = { practice: 'practice', quiz: 'quiz' };

export const PRACTICE_STEPS = [
  {
    stepKey: 'practice_welcome', target: null, position: 'center',
    title: 'Welcome to flashcard practice',
    body: 'Each card shows a word with some letters missing. Fill in the blanks, check your answer, and the card flips to show how you did.'
  },
  {
    stepKey: 'practice_listen', target: 'audio', position: 'below',
    title: 'Listen first',
    body: 'Tap 🔊 to hear the word, or 🐢 to hear it one syllable at a time.'
  },
  {
    stepKey: 'practice_blanks', target: 'blanks', position: 'below',
    title: 'Type the missing letters',
    body: 'Your cursor jumps to the next blank by itself. When every blank is filled, press Check (or Enter).'
  },
  {
    stepKey: 'practice_levels', target: 'level', position: 'below',
    title: 'Levels',
    body: 'Words get harder as you master them: 1 in 2 letters shown, then 1 in 3, then 1 in 4, then no letters. 100% moves a word up; under 60% moves it back.'
  },
  {
    stepKey: 'practice_progress', target: 'strip', position: 'below',
    title: 'Your progress',
    body: 'One dot per word, colored by level. A ✓ means mastered. Tap any dot to practice that word right now.'
  },
  {
    stepKey: 'practice_testdate', target: 'settings-button', position: 'below',
    title: 'Set a test date',
    body: 'Open Settings and pick your test date. The app spaces out reviews so every word is ready in time. Settings also has levels, grading, grid view and word import.'
  },
  {
    stepKey: 'practice_quiz', target: 'modes', position: 'below',
    title: 'Test out with a Quiz',
    body: 'Switch to Quiz to skip words you already know. Listen, spell it with no letters showing, and 100% marks the word mastered. A miss costs nothing.'
  }
];

export const QUIZ_STEPS = [
  {
    stepKey: 'quiz_listen', target: 'quiz-audio', position: 'below',
    title: 'Listen',
    body: 'The word is read aloud. Tap 🔊 to hear it again as many times as you like.'
  },
  {
    stepKey: 'quiz_type', target: 'quiz-input', position: 'below',
    title: 'Spell the whole word',
    body: 'Type the word with no help. Get it 100% right and it is mastered. Miss it and nothing changes.'
  }
];
