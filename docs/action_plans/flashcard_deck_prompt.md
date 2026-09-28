# One-Card-at-a-Time (Flashcard-Style) Practice View

New-session prompt for implementing the flashcard-style deck, plus the plan it's based on. Review status: [Letter Block Enhancements artifact](https://claude.ai/artifact/RMfikWjuea4Y8ZgY8E9vj8) reviewed and shipped everything except this item.

---

## A. Plan

**Goal:** Replace the all-cards-at-once grid (`WordList.jsx` rendering every `WordCard`) with a single card shown at a time, navigated like a flashcard deck, matching the flashcard component used elsewhere in my apps.

### Findings so far
- No flashcard component exists anywhere in the `spelling` repo checkout — it lives in another one of my apps/repos. The prompt below asks Claude to find and read it before writing any code, or ask me for its location if it can't.
- `WordCard.jsx` already exposes `isAllCorrect` (added for the success-color feature) — the deck's auto-advance can key off that directly, no new plumbing needed there.
- `useHiding.js` (`src/hooks/useHiding.js`) is the existing pattern for per-list localStorage state; the new `currentIndex` persistence should mirror it.

### Tasks
1. New `WordCardDeck` component, replacing `WordList.jsx` as what `PracticePage` renders.
   - `currentIndex` state, persisted per list in localStorage (mirror `useHiding.js`), so reopening a list resumes where the student left off.
   - Renders only `words[currentIndex]` through the existing `WordCard` — don't change `WordCard` itself unless the flashcard pattern requires it.
2. Prev/Next navigation, a position readout ("Word 3 of 12"), and swipe gestures on touch if the flashcard reference uses them.
3. Auto-advance to the next word when `WordCard` reports `isAllCorrect`, after a short delay. Manual Prev/Next stays available for review.
4. A progress strip (dot/segment indicator) showing solved vs. unsolved words, so the overview the grid currently gives isn't lost.
5. Ship behind a toggle (grid vs. one-at-a-time) rather than a hard cutover, so it's easy to compare and roll back.
6. Cleanup: `WordCard.jsx`'s "scroll to top on first focus" logic (added to fix mobile keyboard bounce in the grid view) may be redundant once only one card is ever mounted — check whether it can be simplified.

### Verification
- [ ] Existing test suite passes (`npx vitest run`)
- [ ] New tests cover the deck's navigation and localStorage persistence
- [ ] Toggle switches cleanly between grid and one-at-a-time without losing hidden/typed state
- [ ] Auto-advance doesn't fire on a false positive (e.g. before any letters are hidden)
- [ ] Progress strip matches actual solved state after navigating back and forth

**Model:** Sonnet is enough; this is UI/state work with an existing pattern to copy.

---

## B. Prompt for the new session (paste everything in the block)

````text
I want to convert the spelling app's practice view (currently `WordList.jsx` → grid of
`WordCard.jsx`) from showing all word cards at once to showing one card at a time,
flashcard-style — similar to how flashcards work elsewhere in my apps.

First, find my flashcard implementation (search my repos/projects for a "flashcard"
component) and show me its navigation pattern — how it moves between cards, tracks
position, and handles completion — before writing any code. If you can't find one,
ask me for its location/repo rather than guessing.

Once you have the pattern, implement this in the `spelling` repo (branch off `main`):

1. New `WordCardDeck` component replacing `WordList.jsx` as what `PracticePage`
   renders. Tracks `currentIndex`, persisted per list in localStorage (mirror the
   pattern in `src/hooks/useHiding.js`) so reopening a list resumes where the student
   left off. Renders only `words[currentIndex]` through the existing `WordCard` —
   don't change `WordCard` itself unless the flashcard pattern requires it.
2. Prev/Next navigation plus a position readout ("Word 3 of 12"), and swipe gestures
   on touch if the flashcard reference uses them.
3. Auto-advance on success — when `WordCard` reports all letters correct
   (`isAllCorrect`, already wired for the success-color feature), advance to the next
   word after a short delay. Keep manual Prev/Next available for review.
4. Progress strip — a small dot/segment indicator showing solved vs. unsolved words,
   so the overview the grid currently gives isn't lost.
5. Ship behind a toggle (grid vs. one-at-a-time) rather than a hard cutover, so it's
   easy to compare and roll back — a simple setting is fine.
6. Cleanup: `WordCard.jsx` currently has "scroll to top on first focus" logic added
   for the grid view (to fix mobile keyboard bounce) — once only one card is ever
   mounted, check whether that logic is still needed or can be simplified.

Run the existing test suite (`npx vitest run`) before and after, and add tests for the
new deck component's navigation and persistence. Commit and push to a new branch when
done; don't merge or deploy without me confirming.
````

---

## C. When you return to Claude to finalize
Bring back: the branch/PR link and a summary of what the flashcard reference's pattern actually was. Then we will:
- Review the toggle default and whether the grid view should stay as an option long-term.
- Confirm the progress strip and auto-advance feel right (may need a manual pass in-browser on mobile).
- Merge and deploy via `tools\05.deploy_apis.bat` → option `4` (or `03.publish_web_to_cloudflare.bat`), same as the last round.
