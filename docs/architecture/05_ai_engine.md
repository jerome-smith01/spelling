# 05 — Struggle & Pattern Engine (Phase 5)

Phase 5 is delivered in three parts. This document describes what is **built** and is extended after 5b and 5c.

| Part | Scope | Status |
|---|---|---|
| 5a | Shared AI quota, practice sessions, session-aware friction, mastery, pattern tagging, flame | Built (pending deploy) |
| 5b | AI kid tips and parent pattern reports | Not started |
| 5c | Progress dashboard and weekly digest | Not started |

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

Categories: `silent_letters`, `double_consonants`, `vowel_teams`, `r_controlled`, `digraphs`, `endings`, `short_vowels`, `schwa`, `blends`, `soft_c_g`, `ck_dge_tch`, `plurals`, `prefixes`, `y_rules`, `contractions`, `reversals`. A position may carry several. Letters no rule recognises are recorded as `untagged` (never shown to users; feeds the Phase 9 admin report). Rules are heuristics (for example, prefix and plural rules have small exception lists), so extend them by adding a rule plus a test case.

## 5. Pattern statistics (`pattern_stats`, per learner)

Recomputed after every attempts batch from the learner's last 30 days of final answers (at most 3000 raw rows).

| State | Rule |
|---|---|
| `active` | misses on >= 3 distinct words across >= 2 sessions (`PATTERN_MIN_WORDS`, `PATTERN_MIN_SESSIONS`) |
| `cleared` | was active, and >= 90% correct over its last 10 tagged answers (`PATTERN_CLEAR_ACCURACY`, `PATTERN_CLEAR_WINDOW`) |
| `watching` | anything else |

After a pattern is cleared, only misses **newer than `cleared_at`** can re-qualify it, so old misses in the window cannot flip it straight back to active. A (re)activation sets `first_qualified_at` and clears any cached `report_json` so 5b regenerates the parent report.

## 6. API additions

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/spelling/attempts` | Accepts `typed`, `session_id`, `list_id`; upserts `practice_sessions`; recomputes word scores and pattern stats |
| `GET` | `/api/spelling/scores` | Adds `perfect_streak`, `mastered_at` |
| `GET` | `/api/spelling/patterns` | Learner's patterns (active first) with recent examples; excludes `untagged` |

## 7. Tests

```
cd "Astro Project/apps/spelling-tutor-api"
node --test src/lib/patternTagger.test.ts src/lib/scoring.test.ts    # Node 22.6+ (type stripping)
```
Client: `npm test` in `spelling_tutor` (includes `src/utils/friction.test.js`).

## 8. Open items
- Move the daily reset cron and admin routes to an app-neutral worker (the main site is an Astro worker with no `scheduled` handler, so this needs a small `gpf-cron` worker).
- Thresholds are constants at the top of `scoring.ts` and are expected to be tuned with real usage.
