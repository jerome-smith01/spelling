# Phase 3 Action Plan — Cloudflare Backend API + D1 Schema

> **Goal:** Deploy the standalone Hono Worker API (`spelling-tutor-api`) and apply the D1 database schema (`spelling-tutor-db`) with support for shadow user authentication, custom word lists, granular per-letter practice attempts, and friction scoring.

---

## Deliverables & Achievements

1. **D1 Database Instance:**
   - Database Name: `spelling-tutor-db`
   - Database ID: `ca99dabc-2c02-401e-8871-d2cd70bc99aa`
   - Bindings in `wrangler.jsonc`:
     - `spelling_db`: `spelling-tutor-db`
     - `good_plus_fast_db`: `9ca0b62f-289f-44b7-b3b0-2acabbfc7d5d`

2. **D1 Schema Applied (`0001_initial_schema.sql`):**
   - `users`: Shadow users matching GPF main site user IDs.
   - `word_lists`: User custom word lists storing `words_raw` (hyphenated word format).
   - `attempts`: Granular letter-by-letter practice attempt logging.
   - `word_scores`: Aggregated difficulty & friction scores per word, prepped for Phase 5 AI insights.
   - Appropriate indexes for fast queries by user and friction score.

3. **Hono Worker API (`apps/spelling-tutor-api/src/index.ts`):**
   - Unauthenticated health check endpoint: `GET /api/spelling/health`
   - GPF Session Cookie & Bearer auth middleware for `/api/spelling/*`
   - Word Lists CRUD endpoints: `GET /lists`, `POST /lists`, `DELETE /lists/:id`
   - Batch Practice Attempts endpoint: `POST /attempts`
   - Automatic server-side letter friction score calculation
   - Word Scores endpoints: `GET /scores`, `GET /scores/hardest`
   - Deployed at `https://spelling-tutor-api.good-plus-fast.workers.dev`

---

## File Changes Summary

| Action | Path | Description |
|---|---|---|
| Modified | `Astro Project/apps/spelling-tutor-api/wrangler.jsonc` | Configured D1 database ID & bindings |
| Modified | `Astro Project/apps/spelling-tutor-api/package.json` | Added `@hono/zod-validator` |
| Overwrite | `Astro Project/apps/spelling-tutor-api/migrations/0001_initial_schema.sql` | Applied initial 4-table schema |
| Overwrite | `Astro Project/apps/spelling-tutor-api/src/index.ts` | Complete Hono application with auth & routes |
