# Smart Hiding & AI Integration — Plan (implemented; see `../architecture/05_ai_engine.md` §11)

## Goal
Make practice target the letters a lesson is actually about, and use AI to remove setup work: syllables appear automatically, a photo of the homework becomes a saved list, and students can practice the patterns they struggle with most.

Builds on the progressive flashcard deck (`progressive_flashcard_plan.md`) and the Phase 5 struggle & pattern engine (`../architecture/05_ai_engine.md`). Existing docs are not rewritten; each phase updates its own architecture doc section when built.

**Priority: Phase 1 (Smart Hiding) first.** Later phases depend on it but each ships on its own.

> Backend paths below (`apps/spelling-tutor-api/...`) live in the separate Astro Project repo, not this one.

---

## Decisions (locked with the product owner)

| Topic | Decision |
|---|---|
| Name | **Smart hiding** (a new hiding mode alongside 1-in-2 / 1-in-3 / 1-in-4, which stay) |
| Levels | Reuse the deck's 4 levels and scheduler; smart lists swap only *which* letters hide (table below) |
| Progress label | "Level 2 of 4", tracked **per word**, advanced by accuracy (not calendar day) |
| Miss on L2+ | Drops back a level (existing grading table), so a typed miss returns to multiple choice |
| Struggle override | At L3, letters from the student's own struggling patterns **replace** the alternating letters |
| Quiz-out | Still available for any word (existing quiz mode) |
| Progress indicator | **Harvey balls**, filled in traffic-light green |
| Syllables | Dictionary first, AI only for unknown words; **logged-in users only** |
| Image import | One photo → one list; words + title + target letter groups + lesson hints; user reviews then taps Save |
| Larger lists | Tip pointing to the "Copy AI prompt" route, which moves behind an **Advanced** click |
| Pattern table | In the user's profile, sortable, cards on mobile |
| Generate words | 5 words per request, daily cap; add to an existing list **or** create a new list named after the pattern |
| Grade | Ask each student's grade; generated words must be grade-appropriate and child-safe |
| New patterns | Admin is notified (weekly email, **Tuesdays**); AI never changes the tagger or the site on its own |

---

## Phase 1 — Smart Hiding (priority)

### Level ladder for smart lists
Target letters = the lesson's letter groups found in the word (e.g. `ou` in *thousand*).

| Level | What the student sees | Input |
|---|---|---|
| L1 | Target letters hidden | **Multiple choice** from the lesson's own groups only (e.g. `ou` / `ow` / `oi` / `oy`); no extra distractors |
| L2 | Target letters hidden | Typed |
| L3 | Target letters + every other letter starting at the 2nd, skipping the target letters | Typed |
| L4 | All letters hidden | Typed (same as today's L4) |

**Worked example — *thousand*** (t h **o u** s a n d, target `ou`):
- L1/L2: `th _ _ sand`
- L3: alternating indices 1, 3, 5, 7 = h, u, a, d; `u` is already a target → hide **h, a, d** plus `ou` → `t _ _ _ s _ n _`
- L3 with struggle override (student struggles with the `nd` ending): `n`, `d` replace the alternating letters → hide `ou` + `nd` → `th _ _ sa _ _`
- L4: all hidden

**Rules**
- A word with no target letters (lesson pattern absent) falls back to the regular level's 1-in-N hiding.
- Struggle override uses the learner's `active` patterns from `pattern_stats` (logged in only); positions come from the pattern tagger. Logged out → no override.
- Multiple choice is graded like a hidden-letter attempt: right pick = 100% for that group. Attempts are logged with `typed` = the chosen group so friction and pattern stats still work.

### Where target letters come from
- **List field:** "Focus letters" input in Import (e.g. `ou, ow, oi, oy`), saved on the list. Phase 3 fills it automatically from the photo.
- **Pattern tagger:** add a `diphthongs` category (`ou`, `ow`, `oi`, `oy`; also `au`/`aw` if a lesson needs them). Not one of today's 21 tiles — this homework is the first case.
- Matching is longest-group-first so `ow` in *shower* is found as one unit.

### Progress indicator — Harvey balls
Fill = levels **passed**:

| State | Ball |
|---|---|
| Not started | ○ empty |
| Passed L1 (now on L2) | ◔ ¼ |
| Passed L2 | ◑ ½ |
| Passed L3 | ◕ ¾ |
| Mastered | ● full |

- Fill color: traffic-light green token (`--harvey-fill`, light + dark values, ≥3:1 contrast against the card), outline ring always visible.
- Always paired with text ("Level 2 of 4" / "Mastered") and an `aria-label`; never color or shape alone.
- Shown on each card and in the dot strip / word list; reused in the Phase 4 pattern table (accuracy bucketed to 0/25/50/75/100).

### Code (surgical edits, no rewrites)
- New: `src/utils/smartHide.js` (+ tests) — `findTargets(word, groups)`, `smartHiddenIndices(word, level, groups, struggleIndices)`.
- New: `src/components/HarveyBall.jsx` (+ test), `src/components/ChoicePicker.jsx` (+ test).
- Edit: `src/utils/schedule.js` — `hiddenIndicesForLevel` delegates to `smartHide` when the list has focus letters.
- Edit: `WordCardDeck.jsx` (choice UI at L1, Harvey ball, "Level N of 4"), `ImportSection.jsx` (Focus letters field), `useLists.jsx` / list storage (persist focus letters).
- Backend: `patternTagger.ts` adds `diphthongs` + tests; list schema gains `focus_groups` (JSON) column.

### Done when
- [ ] *thousand* produces exactly the hidden sets in the worked example (unit test)
- [ ] L1 shows choices; right pick advances, wrong pick stays/drops per grading
- [ ] A typed miss at L2 drops the word back to L1 choices
- [ ] Harvey ball + text update after each pass; screen reader reads the level
- [ ] Lists without focus letters behave exactly as today

---

## Phase 2 — Auto-Syllables

- On import, unhyphenated words are split automatically. Hyphens typed by the user always win.
- **Order:** bundled syllable dictionary → AI (Workers AI, through `aiQuota`) for words the dictionary doesn't know → cached server-side per word so each word costs at most once, ever.
- **Logged out:** no auto-split. Inline message: *"Add hyphens to show syllables (e.g. foun-tain), or log in to split them automatically."*
- Preview shows the split before Save; the user can edit it.
- AI output is validated: letters must equal the original word exactly, only hyphens added, 1–6 syllables. Anything else is discarded and the word stays unsplit.
- Pronunciation layers in `syllablePhonetics.js` are unchanged.

**Code:** new `src/utils/syllableDictionary.js` (+ data file, tests); edit `wordParser.js`, `ImportSection.jsx`. Backend: `POST /api/spelling/syllables` (batch, cached table `syllable_cache`).

---

## Phase 3 — Homework Photo Import

### Flow
1. Import → **Upload homework photo** (one photo per list).
2. Vision model extracts: **words** (printed word box only; ignore numbering, handwriting and student answers), **title** (e.g. *U1W5 – Diphthongs: ou/ow, oi/oy*), **focus letter groups**, **lesson hints** (e.g. "`oy` ends words, `oi` goes in the middle").
3. Words are auto-syllabified (Phase 2).
4. Review screen: editable title, words, focus letters, hints → **Save**.
5. Hints appear as a one-line tip on the card after a miss (no AI call at practice time).

- Needs a vision-capable model (current `llama-3.1-8b-instruct` is text-only). Choose between a Workers AI vision model and the Claude API during the phase; same quota rules either way.
- No word list found → "We couldn't find a word list in that photo." Never invents words.
- Tip under the uploader: *"Bigger list? Use Advanced → Copy AI prompt with any AI tool, then paste the result here."*
- **Advanced** (extra click) holds the existing prompt generator and the plain-text paste box.
- Requires login; counts against the shared budget, a per-user daily image cap, and a per-IP rate limit.

### Upload security (required)
**Allow only real images**
- Allowlist: JPEG, PNG, WebP. Block SVG (can carry script), GIF, PDF, HEIC and everything else. iPhone HEIC is converted in the browser or rejected with a friendly message.
- Server ignores filename, extension and declared `Content-Type`; it reads the **magic bytes** (`FF D8 FF`, `89 50 4E 47`, `RIFF....WEBP`) and rejects any mismatch.
- `accept="image/jpeg,image/png,image/webp"` on the input is a convenience, not a control.
- Size checked before the body is read (~4 MB) and pixel dimensions read from the header (~12 MP max) to stop decompression bombs.

**Re-encode in the browser**
- Decode → draw to canvas → export a fresh JPEG (~1600 px long edge). Proves the file decodes, strips EXIF/GPS, and drops anything appended (polyglots). The server still validates, since the API can be called directly.

**Never store the photo**
- Processed in memory, sent to the model, discarded. No R2 write, never served back. Only the extracted words, title, focus letters and hints are saved.
- Workers can't run an antivirus engine; re-encoding + not storing is the practical defence. If photos ever need keeping: private bucket, random keys, `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and a scanning service (confirm what Cloudflare offers and on which plan first).

**Model output is untrusted**
- Photo text may contain instructions (prompt injection). The model gets no tools and must return strict JSON; prompt states the image is data, not instructions.
- Each word: letters, apostrophe, hyphen only; length-limited; profanity blocklist; max words per photo. Title: plain text, length-clamped, rendered as text (never raw HTML).

**Hostile-file tests**
- [ ] `.exe` renamed to `.jpg` → rejected
- [ ] SVG with `<script>` → rejected
- [ ] Truncated JPEG → rejected
- [ ] 20000×20000 PNG → rejected before decode
- [ ] Zero-byte file and oversized upload → rejected
- [ ] JPEG with appended ZIP (polyglot) → re-encoded output has no trailing payload
- [ ] Photo containing "ignore previous instructions…" text → only words extracted

---

## Phase 4 — Pattern Progress Table & Generate Words

### Student grade
- New profile field: **grade** (K–8), default 3, editable. Stored on the learner (`learner_id`), not tied to real names.

### Pattern table (profile page)
- Built on the responsive `.grid-table-*` card pattern (desktop grid → mobile cards with the pattern name as the card title). Port only what's needed from the other app's table pattern; `FilterPopover` and the grid CSS do not exist in this repo yet.
- Columns: Pattern · Progress (Harvey ball + %) · Attempts · Last practiced · Status (active / watching / cleared).
- Sort by least practiced, least known (lowest accuracy), most recent. Sort state persisted per user in localStorage.
- Source: existing `pattern_stats` + `GET /api/spelling/patterns` (add accuracy and last-practiced fields).
- Clicking a pattern opens its report (existing) and a **Generate 5 words** button.

### Generate 5 words
- Always 5 words per request. Daily cap: **3 requests / user / day** (one constant), separate counter from the 20/day tip cap, plus the shared kill switch.
- Choice after generating: **Add to existing list** (picker) or **Create new list** (named after the pattern, e.g. "Diphthongs practice").
- Guardrails — the model proposes, code decides:
  - Pattern tagger must confirm the word contains the pattern
  - Word must be in a graded word list at or near the student's grade
  - Profanity / sensitive-word blocklist
  - Not already in the target list
  - Rejected words are logged; if fewer than 5 survive, ask the model again once, then return what passed
- Login required.

---

## Phase 5 — New-Pattern Detection & Admin Email

- When the tagger leaves letters `untagged`, or a photo import returns a focus group that maps to no category, log it to `pattern_candidates` (sanitised pattern text, example words — letters only — count, first/last seen). Same data the planned Phase 9 report needs; build them together.
- **Weekly email, Tuesdays** (cron in `spelling-tutor-api`, via Resend) to the admin only: top candidates with counts. Aggregates only — no student data, no names.
- **Optional agent step:** a scheduled Claude Code routine reads the candidates and opens a **draft PR** adding the tagger rule, a test, and the landing-page tile. It cannot merge; you review. It sees only sanitised candidate fields, never raw user text, because uploads are untrusted input.
- Landing-page tiles should render from one shared pattern registry so a new pattern appears automatically once merged (the tiles live on the main site, outside this repo).

---

## Security & Privacy (all phases)

- **Children's privacy (COPPA).** Parent-controlled accounts, collect the minimum (grade, no real names), don't keep photos, disclose AI processing in the privacy policy. Have the policy reviewed — this plan is not legal advice.
- **Authorization.** Every route scopes data by the logged-in user / learner; no route trusts IDs from the client without that check. Admin checks never trust `Origin` / `Referer` (see `05_ai_engine.md` §1).
- **Cost abuse.** Every AI call (syllables, vision, generation) goes through `checkQuota` / `logNeurons`, per-user caps, and per-IP rate limits on the image endpoint.
- **Output handling.** All AI text is parsed, validated, length-clamped and rendered as text. No `dangerouslySetInnerHTML`.
- **Agent safety.** Agents get least privilege: draft PRs only, no secrets, no merge.

---

## Other enhancements (later, not committed)
- **Confusion pairs:** track which group was chosen/typed instead of the right one (`ow` for `ou`) and feed it into smart hiding and tips.
- **Rule hint after a miss:** show the lesson hint (Phase 3) on the card when a target group is missed.
- **Friday readiness:** "7 of 10 words on track for Friday" for parents, from the existing test-date scheduler.

---

## Open items
- Pick the vision model (Workers AI vs Claude API) by cost, accuracy on real worksheets, and data-handling terms.
- Choose the graded word list source for Phase 4 (licence, grade coverage).
- Mobile table examples: port from the other app's `07_table_patterns.md` when Phase 4 starts.
- Tutorial steps for smart hiding (choice picker, Harvey ball) — add last, per the tutorial-mode rule.
