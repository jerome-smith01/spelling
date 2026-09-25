# Product Specification: Spelling Practice App

## 1. Product Overview
The Spelling Practice App is an interactive, web-based educational tool designed to help elementary school students (specifically targeted at the 3rd-grade level) practice spelling. By visually breaking words down into syllables, offering custom word list imports, and utilizing a progressive "hide and seek" letter mechanism, the app makes memorization easier, customizable, and engaging.

## 2. Target Audience
*   **Primary Users:** 3rd-grade students who are struggling to spell words correctly and need a structured, interactive way to practice.
*   **Secondary Users:** Parents and educators guiding the student's practice, importing custom weekly spelling lists, and setting up learning prompts.

## 3. Core Features

### 3.1. Syllable Segmentation & Import
*   **Default List:** Pre-loaded with curriculum spelling words segmented into syllables.
*   **Custom Word Import:** Users/Parents can import plain text lists using hyphens to separate syllables (e.g., `con-trol`, `speak-er`, `pen-cil`, `bounce`).
*   **Dynamic Parsing:** The app splits words automatically on hyphens and saves custom lists to browser local storage.

### 3.2. AI Formatting Prompt Generator
*   **Integrated Tool:** A dedicated modal provides a pre-written prompt for parents/educators to paste into any AI tool (ChatGPT, Claude, Gemini, etc.).
*   **Purpose:** Instructs the AI to process photos or raw word lists and return *only* hyphenated, plain-text syllable lines ready for copy-pasting directly into the app's importer.
*   **One-Click Copy:** A "Copy AI Prompt" button facilitates quick clipboard copying.

### 3.3. Customizable Success & Error Styling
*   **Color Picker:** Users can choose their preferred "Success Color" via a color picker control (or presets).
*   **Correct Letter State:** Correctly spelled letters highlight with a soft background fill of the selected color and a darker border shade.
*   **Incorrect Letter State:** Incorrectly spelled letters highlight *only* the border with the selected color, leaving the background neutral.
*   **Neutral Default:** All syllable blocks and inputs remain neutral grey by default until validation is triggered.

### 3.4. Progressive Hiding Mechanism
*   **Global Controls:** A dropdown allows selecting a denominator (e.g., Hide 1 in 2 letters, 1 in 3 letters, etc.). A "Hide All" button applies this ratio across all words.
*   **Individual Controls:** Each word features independent "Hide" and "Show" buttons for targeted practice.
*   **Iterative Hiding:** Sequential clicks progressively hide remaining visible letters based on the chosen denominator.

### 3.5. Interactive Typing Experience
*   Hidden letters convert to interactive text input boxes with grey backgrounds and dashed bottom borders.
*   **Auto-Advance:** Typing a character automatically moves focus to the next hidden box.
*   **Smart Backspace:** Pressing backspace in an empty box jumps to the previous hidden box *and* deletes its character in a single keystroke.
*   **Mobile Keyboard Enforcers:** Forced lowercase visual rendering and mobile HTML attributes (`autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`) prevent auto-capitalization or auto-correct interference.

### 3.6. Audio Dictation (Text-to-Speech)
*   Each word features a speaker icon button using the native Web Speech API (`window.speechSynthesis`).
*   Includes fallback try-catch wrappers to guarantee app execution even in restricted preview environments.

### 3.7. Theme and UI
*   **Dark/Light Mode:** Toggle switch supporting light mode (teal background) and dark mode (slate/navy background) with preference persistence.
*   **Typography:** Uses "Comic Neue" font for child-friendly legibility.

## 4. Technical Stack
*   **Frontend:** HTML5, JavaScript (Vanilla ES6+)
*   **Styling:** Tailwind CSS (CDN) + Dynamic CSS Custom Properties (`--success-color`, `--success-bg`, `--success-border`)
*   **Icons:** FontAwesome
*   **Audio:** Native Web Speech API
*   **Persistence:** LocalStorage for theme, custom words, and color settings.