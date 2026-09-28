# 05 — Struggle & Pattern Engine (Phase 5)

Phase 5 is delivered in three parts. This document describes what is **built** and is extended after 5b and 5c.

| Part | Scope | Status |
|---|---|---|
| 5a | Shared AI quota, practice sessions, session-aware friction, mastery, pattern tagging, flame | Built and deployed |
| 5b | AI kid tips and parent pattern reports | Built (pending deploy) |
| 5c | Progress dashboard and weekly digest | Built (pending deploy) |

---

## 1. Shared AI quota (all GPF apps)

One daily neuron budget and one kill switch cover every app that calls Workers AI, so the Cloudflare account is monitored in a single place.

- Tables `ai_admin_config` (key/value) and `ai_neuron_log` (with an `app` column) live in **`good_plus_fast_db`**, migration `jerome-portfolio/migrations/0005_shared_ai_quota.sql`.
- Keys: `ai_enabled`, `neuron_daily_limit`, `neurons_used_today`, `last_reset_date`.
- **Atomic accounting.** Each AI call logs to `ai_neuron_log`, then runs a single
  `UPDATE ... SET value = CAST(CAST(value AS INTEGER) + ? AS TEXT) ... RETURNING value`, so concurrent requests from any app cannot lose updates.
  The kill switch is flipped by one conditional `UPDATE` (`WHERE ai_enabled != 'false' AND used >= limit`); only the request that flips it sends the admin email.
- **Every** AI call, including fire-and-forget auto-triggers, must read `ai_enabled` first and skip when it is `'false'`.
- Flashy Cards' own per-user card-generation caps (`ai_usage`, `ai_usage_global`) stay in its own DB.
- The daily reset cron (`0 3 * * *`), the daily report email and `/api/fc/admin/ai-*` still run in the Flashy Cards worker, now against the shared tables. Moving them to an app-neutral worker is deferred (see Open Items).
- **Admin gate.** `isAdminRequest` allows the admin email, or any request when the Worker itself is served from localhost (`wrangler dev`). It must never trust the `Origin` or `Referer` headers, which any client can forge; an earlier version did, which let any logged-in user switch AI off or change the limit. A test guards this.

## 2. Sessions and "final answer only"

- One visit to a list is one **practice session**. The React app creates `session_id` (UUID) when `PracticeView` mounts and sends it, with `list_id` and the `typed` letter, on every attempt.
- Every Check press is still stored in `attempts` (raw history). Scoring collapses them: within a session only the **last** answer per (word, position) counts, so a corrected miss scores as correct.
- Attempts without a `session_id` (older clients) count as one-answer sessions.
- `attempts.learner_id` equals `user_id` today, so child profiles can be added with family accounts without a data migration.

## 3. Friction and mastery (`src/lib/scoring.ts`)

- **Friction** (per word, letter-level Leech Hunter): per letter position, walking most recent first, each consecutive miss adds `10 × streak` (10, 20, 30, ...), each correct answer subtracts 5; positions are summed, floor 0.
- **Flame** at friction >= 40 (`FLAME_THRESHOLD`). The AI kid tip threshold is 70 (`AI_TIP_THRESHOLD`, used in 5b).
- **Mastery:** 3 perfect sessions in a row (`MASTERY_STREAK`). A session is perfect when every recorded letter ended correct and it covered at least `min(3, word length)` letters. On mastery friction resets to 0, `ai_suggestion` clears, and `word_scores.mastered_at` is set; only attempts **after** `mastered_at` count toward friction from then on.
- **Bounded reads:** each recompute reads at most the last 400 attempts for the word. `attempt_count` / `error_count` remain raw counts.
- Recompute is idempotent, so a retried batch never double-counts.
- Anonymous users get the same flame from `src/utils/friction.js`, computed from their localStorage queue (kept in sync with `scoring.ts`).

## 4. Pattern tagging (`src/lib/patternTagger.ts`)

`tagWord(word)` returns, per letter position, the pattern categories that letter belongs to. `tagMiss(word, position, typed)` adds `reversals` when the typed letter is the mirror of the expected one (b/d, p/q, n/u, m/w). Tagging is deterministic; **the AI never tags**, it only explains (5b).

Categories: `silent_letters`, `double_consonants`, `vowel_teams`, `r_controlled`, `digraphs`, `endings`, `short_vowels`, `schwa`, `blends`, `soft_c_g`, `ck_dge_tch`, `plurals`, `prefixes`, `y_rules`, `contractions`, `reversals`, `open_syllables`, `drop_silent_e`, `c_vs_k_initial`, `high_frequency_irregular`, `roots`. A position may carry several. Letters no rule recognises are recorded as `untagged` (never shown to users; feeds the Phase 9 admin report). Rules are heuristics (for example, prefix and plural rules have small exception lists), so extend them by adding a rule plus a test case.

Notes on the newer categories:
- `open_syllables` covers **one-syllable** words only (me, hi, go, fly). Multi-syllable cases such as ti/ger need syllable breaks, which the server does not receive yet.
- `drop_silent_e` is tagged on the first letter of `-ing` after a consonant-vowel-consonant base (making). Words like "visiting" match the same shape, so they add harmless correct answers; only real misses matter.
- `high_frequency_irregular` and `roots` are list-based (`IRREGULAR_HIGH_FREQUENCY`, `ROOTS_*` in `patternTagger.ts`); extend the lists as the Phase 9 report shows gaps.
- Not built: homophones (needs sentence context) and compound words (needs a curated word list). Revisit later.

## 5. Pattern statistics (`pattern_stats`, per learner)

Recomputed after every attempts batch from the learner's last 30 days of final answers (at most 3000 raw rows).

**Blank answers are ignored.** A Check with nothing typed (`typed = ''`) still counts as a miss for the word's friction (so the flame works), but is dropped before pattern statistics are built, because a blank says nothing about which pattern a child struggles with. Dropping happens before the per-session collapse, so an earlier real wrong answer in the same session is kept. Legacy rows with `typed` NULL are not treated as blank.

| State | Rule |
|---|---|
| `active` | misses on >= 3 distinct words across >= 2 sessions (`PATTERN_MIN_WORDS`, `PATTERN_MIN_SESSIONS`) |
| `cleared` | was active, and >= 90% correct over its last 10 tagged answers (`PATTERN_CLEAR_ACCURACY`, `PATTERN_CLEAR_WINDOW`) |
| `watching` | anything else |

After a pattern is cleared, only misses **newer than `cleared_at`** can re-qualify it, so old misses in the window cannot flip it straight back to active. A (re)activation sets `first_qualified_at` and clears any cached `report_json` so 5b regenerates the parent report.

## 6. AI generation (Phase 5b)

Code: `src/lib/ai.ts` (orchestration), `aiQuota.ts` (budget), `prompts.ts` (prompts and parsers), `patternInfo.ts` (names used in reports).

| Feature | Trigger | Cached in | Invalidated by |
|---|---|---|---|
| Kid tip | Friction crosses 70 for the first time (auto), or a manual request for a word at 40 or above | `word_scores.ai_suggestion` | Mastering the word |
| Parent report | A pattern becomes `active` (auto), or a manual request | `pattern_stats.report_json` | The pattern re-activating after it cleared |

- **Always through the shared budget.** `checkQuota()` (kill switch, then a per-user cap of 20 generations a day) runs before the model and `logNeurons()` after. The cost is logged even when the model returns unusable output, because the call was made.
- **Cached results are free.** A cached tip or report is served even while AI is disabled.
- **Untrusted output.** Model text is parsed to JSON, checked for the required fields, length-clamped, and example words are restricted to plain letters. Inputs to prompts are validated first (words by pattern, typed letters reduced to one lowercase letter), and prompts say the data is not instructions.
- **Auto-generation** runs after the response is sent (`waitUntil`), capped at 3 jobs per attempts batch (reports first, then tips). A failure in one job never stops the others.
- **Errors map to friendly HTTP codes:** 404 unknown, 409 not tricky enough or not active, 429 daily cap, 503 AI disabled, 502 unavailable or unusable output.

Client: `Modal` (focus trap, Esc, backdrop, returns focus), `AITipModal` (opened from the flame; signed-out visitors see a login link and no request is made), `PatternReportModal` (parent report and recent misses).

## 7. Progress, word detail and the weekly digest (Phase 5c)

- **Progress page** (`/progress`): weekly summary card, opt-in email switch, stat tiles, the Mastered / Struggling / Needs-practice buckets (`utils/progress.js`), the spelling patterns list with "Read report", and the all-words table. Patterns and the digest are extras: if either request fails the word progress still shows.
- **Word detail** (`/progress/words/:word`, `GET /api/spelling/scores/:word`): per-letter attempts and misses from final answers, the patterns each letter belongs to, and the cached tip. Miss counts are written out, not shown by color alone.
- **Digest** (`src/lib/digest.ts`): the weekly cron (`0 13 * * SUN`) builds one digest per learner who practiced in the last 7 days and stores it in `weekly_digests`. The summary sentence comes from the AI when the budget allows; otherwise a template is used. One failing learner never stops the run.
- **Email** is opt-in and off by default (`digest_prefs`), goes only to the account's own address, and every email carries a token-based unsubscribe link (`GET /api/spelling/digest/unsubscribe`, no login, identical response for any token). Delivery uses Resend (`src/lib/email.ts`, same provider and FROM address as the main site's contact form) — MailChannels was dropped because it now needs an API key of its own. Requires the `RESEND_API_KEY` secret (`wrangler secret put RESEND_API_KEY` in `apps/spelling-tutor-api`); without it, `sendEmail()` logs and returns `false` rather than throwing, so a digest run never crashes over a missing key.
- **Admin on-demand triggers** (`/admin/ai-credits` on the main site): "Send me a test digest" always emails only the signed-in admin, using their own real data from the last 7 days if they have any, or clearly-labelled sample data otherwise (`sendAdminTestDigest` in `digest.ts`) — never touches `weekly_digests` or `digest_prefs`. "Run the weekly digest now" calls `runWeeklyDigests` directly, exactly like the Sunday cron. Both require an `ADMIN_EMAILS` match (checked in `spelling-tutor-api`, not just the main site) and are rate-limited (5/hour test, 2/hour run) via the `digest_admin_actions` table, which also logs every call (who, when, result) — this table doubles as the rate-limit store so the limit holds across Worker isolates without in-memory state.

## 8. API additions

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/spelling/attempts` | Accepts `typed`, `session_id`, `list_id`; upserts `practice_sessions`; recomputes word scores and pattern stats |
| `GET` | `/api/spelling/scores` | Adds `perfect_streak`, `mastered_at` |
| `GET` | `/api/spelling/patterns` | Learner's patterns (active first) with label, recent examples and cached report; excludes `untagged` |
| `POST` | `/api/spelling/scores/:word/analyze` | Kid tip for a tricky word (cached or generated) |
| `POST` | `/api/spelling/patterns/:pattern/analyze` | Parent report for an active pattern (cached or generated) |
| `GET` | `/api/spelling/scores/:word` | One word's score, per-letter results and tip |
| `GET` | `/api/spelling/digest/latest` | Newest weekly digest, or null |
| `GET` / `PUT` | `/api/spelling/digest/prefs` | Weekly email opt-in (off by default) |
| `GET` | `/api/spelling/digest/unsubscribe?token=` | Unsubscribe link from the email (no login) |
| `POST` | `/api/spelling/admin/digest/test` | Admin only: test digest email to the admin's own address (real data or a labelled sample) |
| `POST` | `/api/spelling/admin/digest/run` | Admin only: runs the full weekly digest job now |

## 9. Tests

```
cd "Astro Project/apps/spelling-tutor-api" && npm test    # tagger, scoring, AI, digest and HTTP API
cd "Astro Project/apps/flashy-cards-api"   && npm test    # shared quota, kill switch, admin gate
cd spelling_tutor                          && npm test    # React app
```
The two API suites use Node's built-in test runner (Node 22.6+, type stripping) and run the real SQL on in-memory SQLite through a small D1 stand-in (`spelling-tutor-api/src/lib/testing/d1.ts`, test-only). The AI is a fake, so tests never spend neurons or touch the network. What they cannot cover: real model output quality, real email delivery, and the Cloudflare cron trigger.

## 10. Open items
- Move the daily reset cron and admin routes to an app-neutral worker (the main site is an Astro worker with no `scheduled` handler, so this needs a small `gpf-cron` worker).
- Thresholds are constants at the top of `scoring.ts` and are expected to be tuned with real usage.
- `RESEND_API_KEY` needs to be set on `spelling-tutor-api` (`wrangler secret put RESEND_API_KEY`, same key value as the main site's) before the digest email, the admin test-send, or the AI-auto-disabled alert can actually deliver. Confirm with a real send before relying on any of them.
- Family accounts: `learner_id` (equal to `user_id` today) is where child profiles will attach. Digests and pattern stats already key on it.
