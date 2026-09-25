# Syllable Engine, Progressive Hiding & Feedback Architecture (Phase 2)

## 1. Word Model & Syllable Segmentation
Spelling Tutor treats a word not as a monolithic string, but as a hierarchical structure of syllables and characters:

```ts
interface LetterItem {
  index: number;         // Global linear index across the word (0 .. N-1)
  char: string;          // Lowercase single character
  syllableIndex: number; // 0-indexed syllable chunk
}

interface Word {
  id: string;            // Unique deterministic or generated ID
  raw: string;           // Original hyphenated string (e.g. "hand-some")
  word: string;          // Combined word (e.g. "handsome")
  syllables: LetterItem[][]; // Syllable chunks of letter items
  letterCount: number;
}
```

### Parsing Contract
* Words are separated by newlines.
* Syllable boundaries are demarcated with hyphens (`-`).
* Non-hyphenated words (e.g. `bounce`) form a single syllable group of length 1.
* Leading bullets and numbers are stripped automatically during normalization.

---

## 2. Progressive Hiding State Machine
Managed by [`src/hooks/useHiding.js`](../../src/hooks/useHiding.js):
* **Global Denominator:** Configurable to `2` (every 2nd letter), `3` (every 3rd letter), or `'all'` (100% hidden).
* **Per-Word Progressive Masking:**
  - Initial click hides letters according to the selected step ratio.
  - Successive clicks on **Hide** progressively select and hide remaining visible letters until the entire word is hidden.
  - **Show** restores visible letters or reveals the whole word.
* **Storage:** Masked sets per word are persisted in `localStorage` (`spelling_tutor_hiding_state_v1`).

---

## 3. Interactive Letter Navigation & Focus Protocol
Implemented across [`LetterInput.jsx`](../../src/components/LetterInput.jsx) and [`SyllableBlock.jsx`](../../src/components/SyllableBlock.jsx):
* **Auto-Advance:** When a valid alphabetical character is typed, the component immediately shifts focus to the next hidden letter in the word's linear hidden sequence.
* **Smart Backspace:** When backspace is pressed inside an empty input box, focus immediately jumps to the previous hidden input *and* deletes its character.
* **Mobile Keyboard Protection:** Enforces `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck="false"`.

---

## 4. Verification Friction (Anti-Guessing UX)
* Typing is free-form and does not produce instant green/red feedback on every keystroke.
* Each card includes a dedicated **"Check"** button.
* When clicked:
  - Correct letters highlight with a soft tinted background (`--selected-color-bg`) and solid border (`--selected-color-border`).
  - Incorrect letters highlight only the border in `--selected-color` with neutral background.
  - Students can modify inputs at any time, clearing previous evaluation results until the next check.

---

## 5. Color Theming & Two Custom Color Slots
Managed by [`src/components/ColorPicker.jsx`](../../src/components/ColorPicker.jsx):
* **Presets:** Provides 6 curated accessible presets (Emerald, Sky Blue, Violet, Amber, Rose, Indigo).
* **Two Custom Color Slots:** Users can click the edit badge (✏️) on either custom slot to open the native color picker, choose any custom hex color, and save it.
* **Persistence:** Both custom colors (`spelling_tutor_custom_colors_v1`) and the active color choice (`spelling_tutor_success_color_v1`) are persisted in `localStorage`.
* **Dynamic CSS Calculation:** Custom colors use `hexToRgba()` to automatically derive soft 15% opacity background tints (`--selected-color-bg`) for correct letters.

---

## 6. Inline Expandable Import Controls
Managed by [`src/components/ImportSection.jsx`](../../src/components/ImportSection.jsx):
* Instead of a blocking modal overlay, clicking **"Import Words"** smoothly expands the **Spelling Practice Controls** card inline.
* Integrates the **🪄 AI Prompt Generator** (with one-click clipboard copy formatted in a plain-text code block) and a live list textarea.
* Saves and syncs directly to `localStorage`, immediately re-rendering the word cards below upon clicking **"Save & Practice"**.

---

## 7. Syllable Audio Synthesis & Visual Pacing Engine
Managed across [`src/hooks/useSpeech.js`](../../src/hooks/useSpeech.js), [`WordCard.jsx`](../../src/components/WordCard.jsx), and [`SyllableBlock.jsx`](../../src/components/SyllableBlock.jsx):
* **Sequential Syllable Scheduling:**
  - Words with multiple syllables speak each syllable individually via Web Speech API `SpeechSynthesisUtterance`, pausing for a configured interval between syllables.
  - An atomic `activeRunIdRef` token invalidates pending timeouts and audio events upon new clicks, preventing overlapping or orphaned audio queues.
* **Synchronized DOM Highlighting:**
  - As each syllable is synthesized, `activePlayback.activeSyllableIndex` updates in state.
  - [`SyllableBlock.jsx`](../../src/components/SyllableBlock.jsx) dynamically assigns the `.syllable-group-active` class, illuminating the spoken syllable group with `--selected-color-bg` and `--selected-color-border` for multi-sensory reinforcement.
* **Card Header Dual Audio Controls:**
  - `🔊` (Normal speed, rate `0.85`) speaks the whole word seamlessly.
  - `🐢` (Syllable-by-syllable) speaks each syllable sequentially. Toggles to `⏹️` while active; clicking it immediately stops playback.
* **Configurable Pacing Presets:**
  - Selectable directly in the top practice toolbar and persisted to `localStorage` (`spelling_tutor_speed_preset_v1`):
    - **Normal:** Rate `0.80`, Pause `400ms`
    - **Slower:** Rate `0.70`, Pause `650ms`
    - **Slowest:** Rate `0.60`, Pause `900ms`
* **Pronunciation Accuracy Engine ([`src/utils/syllablePhonetics.js`](../../src/utils/syllablePhonetics.js)):**
  - Web Speech API mispronounces isolated syllable fragments (e.g. `ty` spoken alone sounds like "tuh").
  - **Layer 1 (Explicit Override):** Teachers can specify pronunciation in the word list: `pret-ty (prit-tee)` or `hand-some (han-sum)`. The phonetic breakdown is spoken by the turtle button while the spelling blocks retain standard spelling.
  - **Layer 2 (Irregular Dictionary):** Automatic phonetic translation for common irregular words (e.g. `pretty` $\rightarrow$ `['prit', 'tee']`, `handsome` $\rightarrow$ `['han', 'sum']`).
  - **Layer 3 (Auto-Phonetic Rule Table):** Regex rules automatically correct common trailing patterns (`ty`/`py`/`ny`/`ly` $\rightarrow$ `-ee`, `tion`/`ssion`/`sion` $\rightarrow$ `shun`, `le` $\rightarrow$ `ul`, `some` $\rightarrow$ `sum`, `er` $\rightarrow$ `ur`).




