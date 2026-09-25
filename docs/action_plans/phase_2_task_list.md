# Spelling Tutor — Phase 2 Task List
> Feature: Core Spelling Features (all 7 from spec)
> Status: In Verification

## Phase 2.1 Data Layer & Hooks
- [x] Create `src/hooks/useWordList.js` preloaded with the 12 curriculum words, parsing hyphenated words into syllable/letter arrays, and persisting to `localStorage`.
- [x] Create `src/hooks/useHiding.js` implementing progressive hiding state machine (denominator 1-in-2, 1-in-3, hide all).
- [x] Create `src/hooks/useSpeech.js` wrapping Web Speech API synthesis with try/catch fallback.

## Phase 2.2 Dynamic Color Styling & CSS
- [x] Create `src/styles/spelling.css` with CSS custom property variables (`--selected-color`, `--selected-color-bg`, `--selected-color-border`), syllable containers, letter boxes, and dashed underline inputs.
- [x] Create `src/components/ColorPicker.jsx` with color presets and custom color selection saved to `localStorage`.

## Phase 2.3 Interactive Spelling Card & Verification Flow
- [x] Create `src/components/LetterInput.jsx` with single-character input, mobile keyboard attributes, auto-advance, and smart backspace.
- [x] Create `src/components/SyllableBlock.jsx` displaying letter boxes in syllable chunks with hyphen separators.
- [x] Create `src/components/WordCard.jsx` integrating syllables, audio pronunciation, hide/show controls, and the "Check" (Verify) button for deliberate friction.

## Phase 2.4 List Controls & AI Importer
- [x] Create `src/components/HideControls.jsx` for global denominator selection and list-wide hide/show actions.
- [x] Create `src/components/ImportModal.jsx` featuring plain-text word list paste area and copyable AI formatting prompt.
- [x] Create `src/components/WordList.jsx` mapping word collections to individual cards.

## Phase 2.5 Page Integration & Polish
- [x] Update `src/pages/PracticePage.jsx` assembling all components with sticky action bar, import trigger, and color selector.
- [x] Run `npm run build` to verify clean compilation (Zero bundle errors, PWA precache verified).
- [ ] User manual verification of the core spelling features.
- [x] Update architecture documentation in `docs/architecture/02_syllable_engine.md` and `docs/architecture/00_overview.md`.
- [ ] Prepare Git commit message.
