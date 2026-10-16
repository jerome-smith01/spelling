# Quiz Mode & On-Screen Keyboard

How the listen-and-spell quiz and the touch keyboard work, and the rules to follow when changing them. Code: `src/components/QuizView.jsx`, `KeyboardFrame.jsx`, `VirtualKeyboard.jsx`; helpers in `src/utils/schedule.js` (`alignSpelling`, `alignCells`, `recentPct`) and `src/utils/session.js` (`letterFor`).

## 1. Principles (read these first)

1. **Kids first: less text, more signal.** Do not add helper or explanatory sentences to the quiz. The result of a word is shown by boxes, colors and icons, not paragraphs. (We removed "No penalty…", "Tested out!…" and "…back in practice" for this reason.)
2. **Show, don't tell, what went wrong.** The student's spelling is shown as letter boxes beside the correct spelling: green = right letter, solid red = wrong or extra letter, an **empty dashed red box = a letter they left out** (never print the missing letter into the box). The correct word is **one** green box around the whole word, not a box per letter.
3. **One results format, shared by the quiz and practice.** "Your spelling" first, then "Correct spelling", for the per-word result (`SpellingResult`) and for the end-of-round review and next-step choices (`RoundSummary`). A practice card result and a practice session summary look and behave exactly like the quiz's. Never build a second format: change the shared component. See §10.
4. **Progress is never lost.** A refresh, or leaving and returning, restores the quiz where the student was (see §4). Anything new that holds in-progress state must be persisted the same way.
5. **Big, obvious buttons with an icon.** Quiz buttons are large (min-height 3.5rem, full width up to 30rem) and every one has an icon from `ActionIcons.jsx`. One primary action per screen; the rest are secondary (`btn-verify-alt`).
6. **Enter always moves forward.** Enter checks the word; once a result is showing, Enter means "next word", wherever focus is (a window-level listener, because the input is gone after checking).
7. **Remember the student's choices.** The last play speed (normal, slow, both) is the auto-play speed for the next word, saved on the device, and the selected speed button is marked with a white outline only (it must not change color on hover or tap).
8. **Cap, don't stretch, on big screens.** UI that scales with the screen (the keyboard) has a maximum width. Do not add user-adjustable layout (drag, resize, pin): it was tried and removed.
9. **Test and look.** Add a Vitest test for every behavior, and check layout in a real browser at phone (360px) and tablet (1024-1366px) widths. Develop on the feature branch; merge to `main` (which deploys) only when asked.

## 2. Quiz flow

* `?mode=quiz` on `/lists/:listId` opens the quiz; `PracticePage` keeps the URL in sync with the Practice/Quiz tab (`onModeChange` → `setSearchParams(..., { replace: true })`), so a refresh or shared link returns to the same mode.
* A round: the word is spoken, the student types it (physical keyboard on desktop, `VirtualKeyboard` on touch), checks it, sees the result, moves on. A word scoring 100% is "tested out" (mastered) via `commitQuiz`; a miss changes nothing for a word that is not yet learned.
* **Progress strip:** the top of the quiz is the same dot strip as practice (`deck-strip session`, `sess-dot`): one dot per word, green check when tested out, gray ✕ when missed, ring on the current word. Dots are not clickable. Each carries `aria-label="Word N of M: …"`. There is no "Word N of M" text badge.
* **Result view:** "Your spelling" (letter boxes, see §3) above "Correct spelling" (one green box). No message text under them.

## 3. Grading, boxes and alignment

* **Score** per word: `alignSpelling` (longest-common-subsequence) → `pct`. **Quiz grade** = average `pct` of the round, letter from `letterFor` (A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F), the same scale as the practice session grade.
* **Boxes** use a different alignment, `alignCells(typed, answer)`: an edit-distance alignment returning `{ ch, kind }` cells with kind `ok`, `extra` (wrong or surplus letter) or `missing`. A wrong letter counts as a **swap** for the letter it replaced, and when a gap is ambiguous the blank goes at the end, so `bi` for `boy` shows `b i _` (not `b _ i`), and `anoy` for `annoy` shows `a _ n o y`.
* The box row never wraps: the box grows with the word up to the screen width, and only then do the letter tiles shrink (`.quiz-letters` is `nowrap`; the quiz stage allows up to 60rem). Keep generous padding so letters stay easy to read.

## 4. Persistence

| Key | Holds |
|---|---|
| `spelling_tutor_quiz_v1:<listId>` (via `learnerKey`) | the round in progress: word order, position, typed text, current result, outcomes, and the drill state below. Cleared when the student presses Exit/Finish. |
| `spelling_tutor_quiz_speed_v1` | last play speed: `normal`, `slow` or `both` |

* Saved state is only restored if every saved word still exists in the list; anything corrupt or unavailable falls back to a fresh quiz (all storage access is in try/catch).
* Restoring a result does **not** re-commit it, so a refresh cannot double-count a word.

## 5. End of quiz and drilling

* The end screen shows the grade, "Tested out of X of Y", then **every word in the round** ("Your spelling" boxes first, then the correct word in one green box) with a green ✓ if tested out or a gray ✕ if not.
* **Buttons, in order of importance:**
  * Words missed → primary **Retake missed words (N)**.
  * Nothing missed → primary **Finish** (exits). Retaking everything is secondary.
  * **Test the N hardest words** (shown when at least one word is below 100%). *Hardest* = lowest `recentPct` (a word whose last-five average is 100% is never hard, so it is left out of the list and the slider's range): the average of the word's last five attempts, i.e. its practice `history` plus the score just made. A slider under the button picks how many (default 3) and shows those words as chips with their percentages, updating as it moves.
  * After a drill, **Next 3 hardest words** and **Practice remaining missed words (N)** work from the **original** round minus the words already drilled (`base` and `drilled` in state, persisted). Starting a fresh round (all words / not yet learned) clears them; retaking missed words inside a drill keeps them.
  * Not yet learned / Retake all words / Back to practice are secondary.
* **Layout of the choices:** labels are left-aligned. Order: retake missed, remaining missed, all words, then a visually separate group (extra spacing) holding **Not yet learned** and **the hardest words**. Each of those two has its own slider under the button, a one-line note, and chips showing the words the slider currently selects (hardest shows each word's last-five percentage; not-yet-learned is ordered weakest first); both sliders start at 3 (or fewer if fewer words qualify). The button label and the words quizzed follow the slider. Each of those two sits in its own box tinted with the theme color (`--selected-color-bg`, so it follows the chosen color) with a white border in dark mode. Notes sit directly under their button.

## 6. Play speed

Three buttons (also on the keyboard): normal, slow (syllable by syllable), both (normal then slow). Pressing one plays it and makes it the default; each new word then auto-plays at the saved speed (`speedRef`, so the timer always reads the latest choice). The default button gets the white ring (`.is-default`), and `.is-default` rules force the base purple so hover or tap states never lighten it.

## 7. On-screen keyboard (`VirtualKeyboard`, `KeyboardFrame`)

* Letters only, no digits or symbols, so the device keyboard and its spell check never appear.
* **Phones** (< 600px wide): unchanged: bottom dock in practice, inline in the quiz, keys 3rem tall (3.5rem in the quiz).
* **Tablets** (≥ 600px): `KeyboardFrame` docks the keyboard at the bottom, centered, `width: calc(100% - 1rem)` capped at `max-width: 52rem`. Key height, font and gaps scale with the keyboard's own width using container units (`container-type: inline-size` on `.vkb`, `cqw` in `.kb-frame` rules) so it stays proportional. There is no move, resize or pin control.
* The frame publishes its measured height as the CSS variable `--kb-h` on `<html>`; `.deck-has-dock` and `.quiz-immersive` use it for bottom padding (falling back to the old fixed value when unset), so the page never sits under the keyboard.
* Pointer-down on keyboard controls must not steal focus from the letter blanks.

## 8. Tests

`QuizView.test.jsx` (persistence, grade, hardest, drilling, Enter, missing-letter box, speed), `KeyboardFrame.test.jsx`, `VirtualKeyboard.test.jsx`, `schedule.test.js` (`alignCells`), and the quiz cases in `WordCardDeck.test.jsx`. jsdom has no layout, so visual changes (box wrapping, keyboard width) are checked in a browser: build, `vite preview`, then drive headless Chromium with touch emulation (`Emulation.setTouchEmulationEnabled`) to get `(pointer: coarse)`.

## 9. Review gate ("take time to review your work")

Children sometimes fly past a mistake without looking. The app notices and asks them to look, escalating only if they keep rushing. Applies to the quiz **and** practice. Code: `utils/reviewPolicy.js`, `utils/reviewCells.js`, `hooks/useReviewGate.js`, `components/ReviewModal.jsx`, `services/reviewEvents.js`.

* **Rushed** = leaving a *missed* word's result in under `RUSH_MS` (1000 ms). Right answers are never gated. Detection happens on the attempt to leave (Next button, Enter, the keyboard's next key), which is wrapped in `gate.guard(proceed)`; a rushed exit opens the popup *instead of* advancing, and after the child finishes it they stay on the result and the next exit goes through.
* **Strikes are per round or session, not per word.** A strike = a missed word whose result was left in under a second. The 1st rushed miss in a quiz round or practice session gets level 1, the 2nd level 2, the 3rd and later level 3, whichever words they are on. Starting a new round or session (retake, drill, "Keep practicing", leaving and returning) starts again at level 1. This gives the quiz all three levels (each word appears once per round) and keeps it gentle.
* **Popup:** the search-check icon plus "Take time to review your work." It is **centered** horizontally and vertically (in the space above the keyboard when one is on screen, via `review-has-kb` and `--kb-h`, which the tablet frame and the phone dock set), below the keyboard's layer (`z-index` 940 vs 950) so the keyboard is never covered; it scrolls if tall. Level 2 and 3 cannot be dismissed without doing the task; level 3 is never a dead end (two wrong tries on a spot fill in the answer). Level 2 closes itself a moment after the last tap; at level 3, once every letter is right the child presses **Enter** (physical or the on-screen keyboard's Enter) or the **Check** button, so they confirm the fix themselves. Level 3 types through the app keyboard (`gate.keyRef`), a physical keyboard, or, on a touch screen with no app keyboard, a hidden field that opens the device keyboard.
* **The gate never changes scores, grades or mastery**: those are settled when the word is checked.
* **Reporting is just a count:** how many times the child triggered the popup. Each completed popup queues `{ context, list_id, word, level, dwell_ms, tries, client_id, occurred_at }` in `spelling_tutor_review_events_v1` (per learner, capped at 500) and is sent to `POST /api/spelling/review-events` in chunks of 50. Until the server has that endpoint (404/405) the app stops trying for the page load and keeps the queue. The server side lives in the website repo: see `docs/action_plans/review_events_server_prompt.md`.
* **Tests:** the existing quiz/practice tests move through results instantly, so those files mock `isRushed` to `false`; gate tests turn it on. jsdom has no layout, so check the popup position in a browser with touch emulation.

## 10. One results format (quiz and practice)

* `components/SpellingResult.jsx`: the per-word result: "Your spelling" (letter boxes: green right, solid red wrong/surplus, empty dashed red left-out) above "Correct spelling" (the word in one green box), no explanatory text. Used by the quiz result and by the practice card back (`WordCardDeck`). The cells come from `utils/reviewCells.js` (`cellsFromSpelling` for typed words, `cellsFromPractice` for practice, where the child only types the hidden letters).
* `components/RoundSummary.jsx`: the end-of-round screen: grade, headline, every word with a green check or gray x and both spellings, then what to focus on (retake missed, the N hardest with a slider, not-yet-learned with a slider, all words, plus next-hardest and remaining-missed after a drill). Used by the quiz and by the end of a practice session. Practice adds its own buttons through `extra` (Keep practicing, Take a quiz).
* `hooks/useDrill.js` holds the drill state (`base`, `drilled`) for both. Practice drills restart the session on just the chosen words (`restartListRef`); each card's first try is recorded in `cardLog` for the review.
* "OK" in the review means **100% on the first try** in practice and **tested out** in the quiz; the grade is the average first-try score (practice) or quiz score.

