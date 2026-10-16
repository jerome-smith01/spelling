# Prompt for the website-repo session: store and report "review gate" events

Paste everything below the line into a Claude Code session opened in the **website repo** (the one containing `apps/spelling-tutor-api`, the Cloudflare Worker with D1 `spelling-tutor-db`).

---

You are working in the website repo, in `apps/spelling-tutor-api` (Hono on Cloudflare Workers, D1 database `spelling-tutor-db`). Read the architecture docs first: `docs/architecture/00_overview.md`, `03_backend_and_schema.md`, `04_auth_and_sync.md` (learners, `X-Spelling-Learner`, `learner_access`, 404-not-403 rule, idempotent `client_id`) and the report code (`lib/` files that build the learner report, class report and exports). Follow the existing patterns exactly (routing, validation, migrations, tests). Plan first, show me the plan, then build. We build it right the first time: tests and docs in the same change.

## What the app does (already built, client side)
Spelling Tutor (repo `jerome-smith01/spelling`) now has a "review gate": when a child leaves a *missed* word's result in under 1 second, a popup says "Take time to review your work." and escalates if they keep rushing (level 1 informational, level 2 tap the wrong letter, level 3 type the fix). Each **completed** popup is queued on the device and sent to a new endpoint that does not exist yet.

## The contract the client already sends
`POST /api/spelling/review-events`, JSON body `{ "events": [ ... ] }`, up to 50 events per request, header `X-Spelling-Learner` names the learner exactly like `/api/spelling/attempts` does. Each event:

```json
{
  "client_id": "uuid",            // idempotency key: a retried batch must not double count
  "occurred_at": "ISO-8601 UTC",
  "context": "quiz" | "practice",
  "list_id": "uuid | null",
  "word": "string (letters, apostrophe, hyphen; same VALID_WORD rule as attempts)",
  "level": 1 | 2 | 3,
  "dwell_ms": 0-1000,             // how long they looked before trying to leave
  "tries": 0-20                   // wrong taps/keys inside the popup (levels 2-3)
}
```
Respond `{ accepted: n }`. 400 for a bad payload (the client drops a rejected chunk), 404 for a learner the user may not act for (exactly as other endpoints), auth like the attempts endpoint. Events for a learner the caller cannot act for are never stored. Do not store anything about the child beyond this (no free text).

## What to build
1. **D1 migration** for a `review_events` table: `client_id` primary key (unique, for idempotent inserts), `learner_id`, `list_id` nullable, `word`, `context`, `level`, `dwell_ms`, `tries`, `occurred_at`, `created_at`; indexes for per-learner by time and per-learner by word. Learner deletion (30-day purge) must remove these rows too, follow how attempts are purged.
2. **Endpoint** with strict validation and length/range clamping (reject, don't coerce, bad levels/contexts), idempotent insert (`INSERT ... ON CONFLICT(client_id) DO NOTHING`), a per-request cap of 50, and the same learner-access check as `/attempts`.
3. **Report data**: add a `review` section to the learner report payload for a date range: total popups, count by level, count by context, the words most often rushed (word, count, highest level, last date), and a weekly trend (same buckets as the existing weekly chart), plus "average dwell before the popup". Include it in the class report per student as a single number (popups per student) if the class report has per-student rows.
4. **Report HTML/exports** (`reportHtml.js` equivalent in the website repo and the CSV/classExport if present): a short "Rushing past mistakes" section: the tiles above, the word list, a plain-language line such as "Ava left 12 mistakes after under a second; 3 words needed a firmer reminder", escaped like every other server string, readable in black and white (words as well as arrows, like `trend()`).
5. **Rules that must hold** (from the architecture docs): reports are for grown-ups only, never shown in kid mode; nothing about a child is emailed (the weekly email stays a link to the dashboard); a user is not a learner (data is keyed by `learner_id`); local-first (the app must keep working if this endpoint is down or missing).
6. **Tests**: validation (every bad field), idempotency (same batch twice), learner access (404 for a stranger's learner, correct learner stamping for family and class accounts), purge on learner delete, report aggregation (empty, one event, many, date range edges), HTML escaping of hostile `word` values.
7. **Docs**: update `03_backend_and_schema.md` (table + endpoint), `04_auth_and_sync.md` if auth/learner rules are touched, and the overview index.
8. **Deploy order** (important, from the docs): apply the D1 migration first, deploy the Worker second. The app already tolerates a missing endpoint (it keeps its queue and retries after a reload), so the app does not need a new release.

When done, tell me the exact commands to apply the migration and deploy, and how to check it end to end (send one event with curl using a test session, then open the report).
