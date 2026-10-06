# Progressive Flashcard Practice — Plan (DRAFT, awaiting approval)

## Goal
One-card-at-a-time flip deck. Hiding gets harder per word as accuracy proves mastery. Review timing adapts to a **test date**. Replaces self-rating with accuracy.

## Levels (visible letters)
L1 = 1 in 2 shown · L2 = 1 in 3 · L3 = 1 in 4 · L4 = all hidden · Mastered = 100% at L4.

## Grading (per attempt, % of hidden letters correct)
- 100% → up one level (pass at L4 = mastered)
- 60–99% → stay
- <60% → down one level (min L1)
Thresholds are editable in Settings.

## Scheduling rules
1. Test date = day N. Practice days = today … N-1. `daysLeft` = practice days remaining (incl. today).
2. After a pass: `gap = round(daysLeft / (levelsLeft + 1))`, min 1 day normally. If `daysLeft <= levelsLeft` (crunch), gap = 0: word re-queues later in the same session at the next level.
3. **Session loop ("keep practicing until right"):** a word stays in today's queue until it scores 100% once at its current level. Misses and partials re-queue ~3 cards later; a drop-down re-queues at the easier level. Every attempt is graded by the same table, so retries naturally climb back.
4. **One level up per day** unless in crunch (rule 2), so a lucky streak doesn't skip real spacing.
5. Mastered words return once on the final practice day as a last check; a miss there drops it to L3 and re-enters the loop.
6. Each day's queue order: re-queued/dropped words, then due words, then not-yet-seen words.
7. No test date: fixed gaps 1 / 2 / 4 days after each pass.
8. Extra practice on non-due words is always allowed. It is graded the same way, can promote or demote, and recomputes that word's next-due.

## Scenarios (Mon–Thu practice, test Fri; 4 levels)
**A. Perfect week.** Mon L1 100% → Tue L2 → Wed L3 → Thu L4 100% = mastered; final check Thu evening.

**B. Stumble, then practice until right.** Tue L2: 50% → drops to L1, re-queued. Retry at L1: 100% → cleared for today, advances to L2, next due Wed (1-day gap). Word is one level behind schedule; Wed's gap uses daysLeft=2, levelsLeft=3 → crunch begins, so it re-queues in-session at L3 the same day if scored 100%.

**C. Partial credit.** Wed L3: 80% → stays L3, re-queued; retry 100% → advances to L4, due Thu.

**D. Missed a day.** Nothing Tue. Wed shows everything due plus Tue's, gaps recompute from the new daysLeft (compresses automatically, may trigger crunch).

**E. Hard word.** Stuck at L2 with repeated 60–99%: stays L2, flagged by the existing struggle flame; AI tip available.

**F. Late start.** Words arrive Thu, test Fri: daysLeft=1 → crunch. All words loop in one session through as many levels as they can pass; anything under L4 at the end shows tomorrow morning as final review.

**G. Longer runway (14 days).** Gaps ≈ 3 / 3 / 2 / 2 days, so real spacing.

**H. Student keeps going after the queue is empty.** Extra practice mode: pick any word, graded the same way; schedule recomputed.

## Settings (single collapsible panel)
Test date · start level · advance/drop thresholds · Grid/Deck toggle · list picker & import · speed/pause · color.

## UI
Card front: hidden-letter word, 🔊 🐢, Check. Flips on Check: correct spelling, "5 of 6 · 83%", "Next: stays at 1-in-3, back in a few cards". Dot strip colored by level (mastered marked) + "N due today".

## Code (surgical edits, no rewrites)
New: `WordCardDeck.jsx`, `useDeckSchedule.js`, `utils/schedule.js` (+tests).
Edit: `WordCard.jsx` (flip back, result callback, drop Hide/Show in deck mode), `useHiding.js` (derive hidden set from level), `PracticePage.jsx` (collapsible settings, Grid/Deck toggle).
Storage: per-list localStorage (mirrors `useHiding`); attempt logging/friction unchanged; no cross-device sync in v1.

## Quiz mode — test out of a word (decisions locked)
- **Entry:** whole-list Quiz only (a mode started from the top bar / settings), covering all not-yet-mastered words. No per-word button.
- **Prompt:** audio only (normal speed), unlimited replay, no other cue. No letters shown.
- **Input:** one text box for the whole word. Scoring aligns the typed text to the answer (edit-distance alignment, so one dropped or extra letter doesn't zero out the rest); accuracy = correctly placed letters / word length.
- **100% = tested out:** word jumps straight to Mastered, skipping remaining levels, and leaves the daily queue (keeps the final pre-test check, rule 5). Reduces `levelsLeft` to 0, freeing daily load.
- **Miss: no penalty.** Word keeps its current level and schedule; quiz is a free shot at skipping ahead. Results still go to the attempt log / friction score.
- Mastered words can be re-quizzed any time.
