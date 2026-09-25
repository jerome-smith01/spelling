# Spelling Tutor — Phase 2 Action Plan: Core Spelling Features
> Reference: `C:\Users\Jerom\My Apps\ai_skills\01.creating_new_features.md`
> Skill: `creating-new-features` | Repo: `jerome-smith01/spelling-tutor` | Phase: `2`

## Overall Status

| Phase | Title | Status | Model | Depends On |
|-------|-------|--------|-------|------------|
| 2 | Core Spelling Features (all 7 from spec) | 🔲 Not Started | Gemini 3.8 Flash (Medium) | Phase 1 |

---

## Resolved Architectural & UX Decisions

1. **Default Curriculum Words:**
   Pre-loaded with 12 3rd-grade words:
   `an-noy`, `ap-point`, `a-void`, `bounce`, `en-joy`, `fig-ure`, `foun-tain`, `pow-er`, `proud`, `show-er`, `thou-sand`, `u-nit`.
2. **Verification Friction (Anti-Guessing UX):**
   Students will **not** receive instant validation per keystroke. They can freely type and retype. Each card has a **"Check" (Verify)** button that evaluates the inputs when clicked. This introduces deliberate friction so students don't guess until it turns green.
3. **Selected Color Theming:**
   Hidden letter inputs display their dashed bottom border in the student's active **Selected Color**. Correct letters receive a soft tinted background + solid border in that color; incorrect letters highlight only the border with a neutral background.
4. **AI Prompt Generator Copyability:**
   The prompt specifically instructs external AI tools (ChatGPT, Claude, Gemini) to return results in a clean, plain text code block without numbers or commentary, allowing one-click copy and instant pasting into the app.
5. **Persistence:**
   Word lists, hiding denominator, active inputs, validation states, and selected color are preserved in `localStorage`.

---

## Phased Implementation Breakdown

### 2.1 Data Layer & Hooks
**Goal:** Implement parsing for hyphenated words, local storage persistence, syllable structures, hiding logic, and text-to-speech.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/hooks/useWordList.js` | Load default 12 words, parse custom hyphenated imports, persist to `localStorage` |
| NEW | `src/hooks/useHiding.js` | Manage progressive letter hiding state (ratio 1-in-2, 1-in-3, hide all) |
| NEW | `src/hooks/useSpeech.js` | SpeechSynthesis wrapper with try/catch and voice pitch/rate tuning for 3rd graders |

**Key Pattern — Word Structure:**
```js
// "foun-tain" -> { id, raw: "foun-tain", word: "fountain", syllables: [["f","o","u","n"], ["t","a","i","n"]] }
```

**Recommended Model:** `Gemini 3.8 Flash (Low)`
*Reason: Deterministic data transformations and Web API hooks with well-defined contracts.*

---

### 2.2 Dynamic Color Styling & CSS
**Goal:** Implement the success color picker and CSS custom property styling for validation states.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/styles/spelling.css` | Styles for syllable blocks, letter inputs, dashed colored borders, and cards |
| NEW | `src/components/ColorPicker.jsx` | Preset palettes (Emerald, Sky Blue, Violet, Amber, Rose) + custom picker |

**Key Pattern — Selected Color Variables:**
```css
:root {
  --selected-color: #10b981;
  --selected-color-bg: rgba(16, 185, 129, 0.15);
  --selected-color-border: #059669;
}
.letter-input {
  border-bottom: 2px dashed var(--selected-color);
}
.letter-box.correct {
  background-color: var(--selected-color-bg);
  border-color: var(--selected-color-border);
}
.letter-box.incorrect {
  border-color: var(--selected-color);
  background-color: transparent;
}
```

**Recommended Model:** `Gemini 3.8 Flash (Low)`
*Reason: Styling declarations and straightforward color selection component.*

---

### 2.3 Interactive Spelling Card & Verification Flow
**Goal:** Build the syllable blocks, letter input with auto-advance and smart backspace, and the "Check" (Verify) button.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/components/LetterInput.jsx` | Single-character input with auto-advance, smart backspace, and mobile attrs |
| NEW | `src/components/SyllableBlock.jsx` | Visual chunk container grouping letters with clean spacing |
| NEW | `src/components/WordCard.jsx` | Word card featuring syllables, Audio button, Hide/Show toggles, and "Check" verify button |

**Key Pattern — Auto-Advance & Smart Backspace:**
```jsx
const handleKeyDown = (e) => {
  if (e.key === 'Backspace' && value === '') {
    e.preventDefault();
    onBackspace(); // Jump to previous hidden box AND clear its character
  }
};
const handleChange = (e) => {
  const char = e.target.value.slice(-1).toLowerCase();
  onChange(char);
  if (char) onAdvance(); // Shift focus forward
};
```

**Recommended Model:** `Gemini 3.8 Flash (Medium)`
*Reason: Focus management across multiple input refs, mobile keyboard safeguards, and validation state toggles.*

---

### 2.4 List Controls & AI Importer
**Goal:** Provide the global hide denominator controls and the custom import modal with AI prompt copy.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/components/HideControls.jsx` | Global denominator dropdown (1 in 2, 1 in 3, All) + "Hide All" / "Show All" |
| NEW | `src/components/ImportModal.jsx` | Custom word paste area + one-click copyable AI formatting prompt |
| NEW | `src/components/WordList.jsx` | Grid/list container mapping words to `WordCard` components |

**Key Pattern — AI Prompt Generator:**
```text
You are a spelling assistant. I will give you a list of spelling words, a photo of a spelling worksheet, or raw text.
Return ONLY the words segmented into syllables using hyphens, one word per line, inside a single plain text code block.
No numbers, no explanations, no other punctuation.

Example output:
an-noy
ap-point
foun-tain
bounce
```

**Recommended Model:** `Gemini 3.8 Flash (Medium)`
*Reason: Modal focus trap, clipboard interaction, and state integration across the full word list.*

---

### 2.5 Page Integration & Polish
**Goal:** Assemble all Phase 2 components into `PracticePage.jsx`, wire up reset and persistence, and ensure smooth responsive layout.

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/pages/PracticePage.jsx` | Assemble Header controls, ColorPicker, HideControls, WordList, and ImportModal |

**Recommended Model:** `Gemini 3.8 Flash (Medium)`
*Reason: Top-level component composition and lifecycle synchronization.*

---

## Accessibility Best Practices
- Every letter input receives an accessible label: `aria-label="Letter [position] of [total] in [word]"`.
- Syllable blocks marked with semantic boundaries.
- Pronunciation button provided with `aria-label="Pronounce [word]"`.
- Verification results announced or clearly contrasted for colorblind users (distinct icon / checkmark alongside border color).
- Modal traps keyboard focus and closes with `Escape`.

---

## Manual Verification Checklist

- [ ] **Default List:** Verify all 12 curriculum words (`an-noy`, `bounce`, etc.) render on first load with syllable blocks.
- [ ] **Audio Dictation:** Click the speaker icon on a card &rarr; browser clearly speaks the word.
- [ ] **Hiding Ratios:**
  - Select "Hide 1 in 2" and click "Hide" on a card &rarr; every 2nd letter turns into a dashed input.
  - Check that the dashed underline is rendered in the active selected color.
- [ ] **Typing & Navigation:**
  - Type a letter in a hidden box &rarr; cursor automatically jumps to the next hidden box.
  - Press backspace in an empty box &rarr; jumps to previous box and deletes its letter.
  - Student can freely change/re-type letters without instant lock-out.
- [ ] **Verification Friction:**
  - Click "Check" / "Verify" &rarr; correct letters turn soft green (or selected color) with solid border; wrong letters show colored border with neutral background.
- [ ] **Color Customization:**
  - Change selected color to Purple or Blue &rarr; dashed lines and validation states update immediately.
- [ ] **Import & AI Prompt:**
  - Open Import Modal &rarr; click "Copy AI Prompt" &rarr; shows "Copied!" notification.
  - Paste custom words (e.g. `pa-per\npen-cil`) &rarr; saves and displays new words immediately.
- [ ] **Persistence:**
  - Refresh the page &rarr; word list, selected color, and practice state remain intact.
