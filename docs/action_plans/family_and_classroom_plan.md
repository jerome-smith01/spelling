# Family & Classroom Accounts — Plan (F1–F6 built; waiting on your to-do list below)

## Goal
Let one adult (a **parent** or a **teacher**) set up and follow several children. The adult creates or links learners, assigns word lists, and sees progress and reports for each child, or for a whole class at once. Children practise exactly as they do today; their results belong to their own learner profile, not to the adult.

Parent → child and teacher → student are **the same feature**. Both are a *supervisor* with *learners*. Teachers add groups (classes), bigger limits and class-wide reports.

This builds on the `learner_id` column that Phase 5 already added for this purpose (launch plan, "Family accounts" note). Existing docs are not rewritten; each phase updates its own architecture doc section when built.

> Backend paths below (`apps/spelling-tutor-api/...`, `portfolio-website/...`) live in the `good-plus-fast-website` repo, not this one.

---

## Decisions for you
I made a default for each one so work can start. Change any of them; the ones marked ⚠️ are hard to undo after launch.

| # | Decision | My default | Why it matters |
|---|---|---|---|
| D1 ⚠️ | How do young children sign in? | ✅ **Approved:** No child login. Children are *managed profiles* inside the adult's account (no email, no password). The child picks their face on the adult's device ("Who's practising?"). | Avoids collecting data from under-13s directly (COPPA). Simplest to build. |
| D2 | Can the child leave their profile without the adult? | ✅ **Approved:** No. Switching profile or opening adult screens needs a 4-digit **adult PIN** (set once, stored hashed). Can be turned off. | Stops a child opening a sibling's profile or the reports. |
| D3 | Can a learner with their *own* GPF account be linked to an adult? | **Yes (F5)**, via a one-time invite code the learner accepts. *Not explicitly answered: built as proposed, please confirm.* | Needed for teachers whose students already have accounts, and for two-parent families. |
| D4 ⚠️ | Who owns a child's practice data? | ✅ **Approved:** The learner profile. Every adult linked to it sees the same history. Unlinking an adult never deletes it. | Decides what happens when an adult unlinks or deletes their account. |
| D5 | Is "teacher" a different account type? | ✅ **Approved:** No. Any account can create a class. | One code path; no "upgrade to teacher" flow. |
| D6 | Limits | ✅ **Approved:** 8 children per parent. Teachers get 5 classes of 40 students. Lists stay 25 per adult. | AI budget is shared across GPF; limits keep one class from using it all. |
| D7 | Do assigned lists copy or share? | ✅ **Approved:** Shared (by reference). The adult edits a list once and every assigned learner sees the change. Learners cannot edit assigned lists. | A copy would let lists drift; sharing keeps one source of truth. |
| D8 | What counts as an assignment being "done"? | **Changed (owner, 2026-10-14):** 100% at every stage, from the Harvey balls. An assignment is done when **every word has passed every stage at 100%** (the Harvey ball is full). The percentage shown is stages passed over all words and stages. | Drives the "Assigned" badges and the class report. |
| D9 | Weekly digest | **Changed (owner, 2026-10-14):** the email is **a link to the dashboard**, where the week's numbers and the PDF / HTML exports are. One email per opted-in adult, **no names and no numbers in it**. A teacher whose class practised gets it too. Opt-in stays off by default. | Nothing about a child ever goes by email; fewer emails; reuses Phase 5c. |
| D10 | Can a learner (or a linked account) see reports? | **Changed (owner, 2026-10-14):** children and students see **their own progress** on the dashboard (Progress page: words, accuracy, tricky words, kid tips) but **no reports**: no weekly summary, no email setting, no pattern reports, no PDF/HTML exports. | Reports are written to the adult ("your child…"). |
| D11 ⚠️ | Teacher / school privacy | **Changed (owner, 2026-10-14):** students are stored as **first name and last initial** (like "Ava S.") plus grade, an avatar, and the teacher's consent note. Full last names, emails, links and phone numbers are refused. No student emails unless they link their own account (D3). Privacy page gets a "Children" section. *Worth a lawyer's check before marketing to schools.* | Schools may need a data agreement. |
| D12 | Existing users | Their account becomes a **self learner** (`learner_id = user_id`). Nothing moves and nothing changes on screen until they add a child. *Not explicitly answered: built as proposed.* | No data migration risk for current users. |
| D13 | Pricing | ✅ **Approved:** Free during beta, no paywall code in this plan. | Teacher features are the natural paid tier later; not decided here. |

Answered (2026-10-13):
- **Q1 — Yes.** A teacher invited by a parent sees that child's full history (same view as the parent), through an F5 invite.
- **Q2 — PDF report.** A printable report per learner (F3) and per class (F6), alongside CSV export. See [PDF reports](#pdf-reports).


---

## Your to-do list (placeholders for you)
Everything below needs you (a decision, an account, or words only you can write). Code markers are searchable as `TODO(owner)`.

### 1. Deploying (in this order, nothing is live yet)
1. **Back up** the database: `npx wrangler d1 export spelling-tutor-db --remote --output backup-before-family.sql`
2. **Apply the migrations** (in `good-plus-fast-website/apps/spelling-tutor-api`): `npx wrangler d1 migrations apply spelling-tutor-db --remote`. This applies `0012` learners, `0013` PIN, `0014` assignments, `0015` invites, `0016` classes, `0017` deck progress. `0012` rebuilds `word_scores`: after it, check `SELECT COUNT(*) FROM learners` equals `SELECT COUNT(*) FROM users`, and the `word_scores` row count is unchanged.
3. **Check migration `0011`.** The docs say `pattern_candidates.handled_at` was added in `0011`, but there is no `0011` file in the repo. Confirm the production database already has that column (or add the file); the family migrations do not depend on it.
4. **Deploy the Worker** (`npm run deploy`), **then publish the app** (the migrations must come first: the new Worker needs the new tables).
5. **Smoke test with two real devices:** add two children, give each a list, practise as each offline then reconnect, set a PIN and try to leave kid mode, make a class of 3, join it from a second account with the class code, export a class report as PDF and HTML.

### 2. Words and legal (placeholders in the app)
- **Privacy page, "Children" section** for the Spelling Tutor: what we keep (first name + last initial, avatar, grade, practice), who sees it (the adults linked to the child), deletion (hidden at once, removed after 30 days), no child emails. Link it from the Family page (`TODO(owner)` in `FamilyPage.jsx`).
- **Class consent wording** (the tick box on the "Make a class" form, `TODO(owner)` in `ClassesPage.jsx`): have it checked against your terms and any school or district data rules.
- **Lawyer check before you market to schools** (decision D11): children's privacy rules (COPPA, FERPA, state student-privacy laws) and whether schools will ask you to sign a data agreement. This is not legal advice.
- **Terms:** a short line that a teacher is responsible for having permission to enter students' names.

### 3. Please confirm
- **D3 and D12** were not in your last reply; I built them as proposed (students with their own login can be linked by code; existing accounts become a "self" learner with nothing changing for them).
- **Name rule:** a name is a first name plus an optional last initial; "Ava Smith", "Mary Ann Lee", emails, links and phone numbers are refused. It is one function (`nicknameProblem` in `lib/family.ts`) if you want it looser. A two-word first name needs a hyphen ("Mary-Ann L.").
- **Assignment progress never goes backwards** (a word once mastered in an assigned list stays done even if missed later, and a second device cannot lower it). Say if you would rather it could drop.
- **Students on their own login** can export reports about *themselves* (it is their own account). Say if students should not have that either.
- **Kid settings:** a child currently has no settings at all (`TODO(owner)` in `PracticePage.jsx`). Do you want audio speed only?
- **Weekly email sender:** the email is now a plain link. Confirm the existing Resend sender is fine for this (launch plan, "Before Phase 5c").

### 4. Watch after launch
- **Cloudflare plan limits:** a class overview takes a handful of queries (tested at under 25 for 40 students), so it is fine on the free plan's limits, but check D1 read-row usage after a month: the overview scans each student's last week of attempts.
- **AI budget:** class students get no AI weekly summary (a class of 40 would spend 40 a week), but kid tips and pattern reports for them still use the teacher's shared quota.
- **A time field for attempts:** attempts are stamped when the server stores them, so offline practice counts on the day it syncs and there is no "minutes practised". Adding a client timestamp to each queued attempt would fix both.

### 5. Not built (ideas, say if you want any)
Co-teachers on one class, moving students between classes in one step, a note per student, syncing every deck level (not just assigned lists) so an adult can see them, emailing a PDF.

---

## Core model

```mermaid
flowchart LR
    A["GPF user\n(parent / teacher)"] -->|"learner_access\n(role, permissions)"| L1["learner\nkind=managed\n'Maya', grade 3"]
    A --> L2["learner\nkind=managed\n'Leo', grade 1"]
    A -->|"owns"| G["group\nkind=class\n'Room 12'"]
    G -->|"group_members"| L1
    G --> L3["learner\nkind=self\n(student's own GPF account)"]
    A -->|"owns"| WL["word_lists"]
    WL -->|"assignments\n(learner or group)"| L1
    WL --> G
    L1 --> D["attempts · word_scores · pattern_stats\n· practice_sessions · weekly_digests\n(all keyed by learner_id)"]
```

* **User** = someone who logs in (unchanged, lives in `good-plus-fast-db`).
* **Learner** = someone who practises. Either `self` (id = their user id) or `managed` (owned by an adult, no login).
* **Access** is always checked as "may *this user* act for *this learner*, and with which permission?".

### New tables (`spelling-tutor-db`, next free migration numbers)

```sql
CREATE TABLE learners (
  id            TEXT PRIMARY KEY,          -- = users.id for kind 'self'
  kind          TEXT NOT NULL,             -- 'self' | 'managed'
  owner_user_id TEXT NOT NULL,             -- the adult who created it (self: the user)
  display_name  TEXT NOT NULL,             -- first name + optional last initial only
  avatar        TEXT,                      -- emoji or preset key, never a photo
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at    DATETIME                   -- soft delete; hard delete job after 30 days
);
-- grade stays in learner_profiles (already keyed by learner_id)

CREATE TABLE learner_access (
  learner_id   TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL,              -- 'self' | 'owner' | 'guardian' | 'teacher'
  can_assign   INTEGER DEFAULT 1,
  can_view_reports INTEGER DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (learner_id, user_id)
);
CREATE INDEX idx_learner_access_user ON learner_access(user_id);

CREATE TABLE learner_groups (
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'family',   -- 'family' | 'class'
  join_code     TEXT UNIQUE,                       -- F6 class code, nullable
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at   DATETIME
);
CREATE TABLE group_members (group_id TEXT, learner_id TEXT, added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, learner_id));

CREATE TABLE assignments (
  id          TEXT PRIMARY KEY,
  list_id     TEXT NOT NULL REFERENCES word_lists(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL,               -- user id
  learner_id  TEXT,                        -- exactly one of learner_id / group_id
  group_id    TEXT,
  due_at      DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME
);

CREATE TABLE invites (                      -- F5
  code        TEXT PRIMARY KEY,             -- 8 chars, no look-alike letters
  learner_id  TEXT,                         -- invite an adult to an existing learner, or
  created_by  TEXT NOT NULL,                -- invite a self learner to link to this adult
  role        TEXT NOT NULL,
  expires_at  DATETIME NOT NULL,            -- 7 days
  used_by     TEXT, used_at DATETIME
);

CREATE TABLE supervisor_settings (
  user_id     TEXT PRIMARY KEY,
  pin_hash    TEXT,                         -- D2, PBKDF2 via WebCrypto
  kid_mode_default_learner TEXT,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Existing tables that must change
Found while reading the code. These are the real work in F1.

| Table / code | Today | Change |
|---|---|---|
| `word_scores` | `UNIQUE(user_id, word)`; every query uses `user_id` | Add `learner_id`, backfill `= user_id`, new unique index `(learner_id, word)`. SQLite cannot drop the old constraint, so **rebuild the table** (create new, copy, rename) in one migration. |
| `attempts` | `learner_id` already written (= user_id) | Write the real learner id. Idempotency index `(user_id, client_id)` stays. |
| `lib/digest.ts` `collectFacts` / weekly job | Reads `attempts.user_id` and `word_scores.user_id`; selects `DISTINCT user_id` | Switch to `learner_id`; job iterates learners, then groups digests by adult (D9). |
| `pattern_stats`, `practice_sessions`, `learner_profiles`, `weekly_digests`, `word_generation_log` | Keyed by `learner_id` but always given `userId` | Only the value passed in changes. |
| `word_lists` | Owned by `user_id` | Unchanged owner. Add nullable `learner_id` for a list made *for* one child (else it is the adult's library). |
| `digest_prefs` | per user | Unchanged (it is the adult's email). |
| `photo_import_log`, AI quotas | per user | Stay per **adult** user — the adult pays the budget for all their learners. |

---

## Request flow
Every learner-scoped call sends the chosen learner:

```
X-Spelling-Learner: <learner_id>     (omitted = the user's self learner)
```

The Astro proxy already forwards all request headers, so no proxy change is needed (`portfolio-website/src/pages/api/spelling/[...path].js`).

New middleware after auth in `apps/spelling-tutor-api/src/index.ts`:
1. Ensure a `learners` + `learner_access` row exists for the user's self learner (cheap upsert, same spot as the shadow-user upsert).
2. Read the header; if present, look up `learner_access (learner_id, user_id)` and `learners.deleted_at IS NULL`. Missing → **404** (same as a list that does not exist, matching the current URL-is-not-a-credential rule).
3. `c.set('learnerId', …)` and `c.set('access', { role, canAssign, canViewReports })`.
4. Routes swap `c.get('userId')` → `c.get('learnerId')` wherever the data is the child's (attempts, scores, patterns, profile, digest, generate words). Report routes (`/patterns/:p/analyze`, `/digest/*`) also require `canViewReports`.

One `requireLearnerAccess` helper owns this check; a test asserts every learner route goes through it (route table scan), so a new route can't skip it.

## Front end (this repo)
* `useLearner.jsx` context: `{ learners, activeLearner, setActiveLearner, isKidMode }`. Persisted in `localStorage` (`spelling_tutor_active_learner_v1`). `apiService.js` adds the header.
* `attemptQueue.js`: each queued attempt stores `learner_id`; the flush groups by learner and sends one request per learner. Old queued items without it belong to the self learner.
* Lists cache (`spelling_tutor_lists_v5`) stays the adult's library. Assigned lists come from a new read-only endpoint and are cached per learner.
* Kid mode hides: Profile, Progress reports, list editing, photo import, settings. Exiting needs the PIN (D2).
* New URLs (relative to `/spelling/app`):

| URL | Screen |
|---|---|
| `/who` | "Who's practising?" picker (avatars + "Grown-up" tile) |
| `/family` | Adult's learners and groups: add, rename, grade, avatar, delete |
| `/family/:learnerId` | One learner: summary, assignments, progress (reuses ProgressPage) |
| `/class/:groupId` | Class report (F6) |
| `/join/:code` | Accept an invite (F5) |

Progress, word detail and pattern screens are reused as-is with the learner switched; no duplicate pages.

---

## Phases
Each phase ships on its own and is safe to deploy with the next one unbuilt.

### F1 — Learner foundation (no visible change) — ✅ built (2026-10-14)
> Built in `good-plus-fast-website` on branch `ccr-e562d473-9a1h7s`: migration `0012_learners.sql` (0011 left free for `handled_at`), `src/lib/learners.ts`, middleware + routes in `src/index.ts`, tests in `src/learners.test.ts`. Not yet deployed — see *Deploying F1* below. Only `learners` and `learner_access` were created; the group, assignment, invite and settings tables are created by the phase that first uses them.
Backend only. Learners and access tables; self-learner upsert; `X-Spelling-Learner` middleware; `word_scores` rebuild; every route moved to `learnerId`; digest reads `learner_id`.
**Done when:** all existing tests pass with no header sent; new tests prove a user gets 404 for a learner they are not linked to, on every learner route; production data unchanged except new rows.

**Deploying F1** (order matters — the new code needs the new tables):
1. Back up: `npx wrangler d1 export spelling-tutor-db --remote --output backup-before-0012.sql`
2. Migrate: `npx wrangler d1 migrations apply spelling-tutor-db --remote`
3. Check: `SELECT COUNT(*) FROM learners` equals `SELECT COUNT(*) FROM users`; `SELECT COUNT(*) FROM word_scores` unchanged.
4. Deploy the Worker: `npm run deploy` in `apps/spelling-tutor-api`.

### F2 — Parent: child profiles + kid mode — ✅ built (2026-10-14)
> Backend (`good-plus-fast-website`): migration `0013_family_pin.sql`, `lib/family.ts`, `lib/pin.ts`, `/api/spelling/family/*`, 30-day purge in the cron; tests in `src/family.test.ts`. Front end (this repo): `activeLearner.js`, `familyApi.js`, `useLearner.jsx`, `WhoPage`, `FamilyPage`, `PinPad`, header/route guards, per-learner storage keys; tests in `familyMode.test.jsx` and `attemptQueue.learner.test.js`. Deploy: apply migration `0013` (`wrangler d1 migrations apply spelling-tutor-db --remote`) **before** the Worker, then publish the app.
> Found while building: deck progress and hiding state live in the browser keyed by list only, so two children on one device would have shared them. They are now scoped per learner (the user's own keys are unchanged).
Create / edit / delete managed learners (D1, D6). "Who's practising?" picker, adult PIN (D2), header wiring, per-learner attempt queue. Grade per child (existing `learner_profiles`).
**Done when:** a parent with two children can hand the phone to each child, each child's practice lands only in their own progress, and the child cannot reach adult screens without the PIN.

### F3 — Monitoring & reports for the adult — ✅ built (2026-10-14)
> Backend: `lib/supervisor.ts` (summary + period report), `/api/spelling/supervisor/overview` and `/report` (user-level), the weekly job rewritten to send **one email per opted-in adult** (a guardian or teacher with report access gets their own copy; since the owner's review the email is only a link, see the note below), `src/supervisor.test.ts`. Front end: overview cards on `/family`, "Progress" (opens that child's Progress page with a "Back to me" banner), `/family/:learnerId/report`, `utils/reportHtml.js`, tests `reportHtml.test.js`, `reportPage.test.jsx`. No deploy step beyond the Worker and the app (no new migration).
> **Changed after review (2026-10-14):** the weekly email is now just a link to the dashboard (no names, no numbers; see D9), so the section-per-child email described above is gone. A teacher whose class practised also gets it, with a second link to `/classes`.
> **Exports:** the report is one self-contained HTML document (inline CSS and SVG, no scripts, everything escaped). *Download PDF* prints that document (choose "Save as PDF"); *Download HTML* saves the identical string as `spelling-report-<name>-<from>-to-<to>.html`. Shown in a script-less sandboxed frame.
> **Not built:** "minutes practised" (attempts are stamped when the server stores them, so offline practice counts on the day it syncs; real minutes need a client timestamp on each attempt — see open items). Class reports and "All students" export are F6.
* `/family` overview: one card per learner — last practised, minutes / sessions this week, words mastered, struggling count, active patterns (all from existing tables).
* `/family/:learnerId`: existing Progress page for that child plus pattern reports.
* `GET /api/spelling/supervisor/overview` returns all linked learners' summary in one call (no N+1 from the client).
* Weekly email per adult: a link to this dashboard, no child details (D9).
* **PDF report per learner** (Q2) — see [PDF reports](#pdf-reports).
**Done when:** a parent can answer "how is each child doing this week?" from one screen and one email.

### F4 — Assignments — ✅ built (2026-10-14)
> Backend: migration `0014_assignments.sql`, `lib/assignments.ts`, `/api/spelling/assignments` (user-level: POST, GET `?learner=`, DELETE), `GET /api/spelling/assigned-lists` (learner-level), assignments in the overview and the report, purge, `src/assignments.test.ts`. Front end: "Assign" modal and per-child assignment rows on `/family`; an **Assigned** row at the top of the decks page (progress bar, due date, Done badge); assigned lists open read-only through `useLists` (so a student on their own account, F5/F6, can practise a list they do not own) and are cached for offline; `assigned.test.jsx`. Deploy: apply migration `0014` before the Worker.
> **D8 (owner, 2026-10-14): done = every stage at 100%.** The Harvey-ball stage of each word lives in the learner's browser, so for a list assigned to them the app reports it (`PUT /api/spelling/progress/:listId`, migration `0017_deck_progress.sql`; `GET` lets a second device carry on). *percent* = stages passed over all words and stages (a word at stage 3 has passed 2 of 5; mastered = 5 of 5); *complete* = every word mastered. An assigned list is also practised **strictly**: a stage is passed only at 100%, whatever threshold is saved. Progress only moves forward. Deploy: migrations `0014` and `0017` before the Worker.
> Only lists already saved to the account can be assigned (the built-in default is virtual until edited). Assigning to a class (F6) writes one row per student.
Assign a list to a learner or a group, optional due date (D7). Children see an **Assigned** row at the top of their lists with a progress ring; the adult sees completion per learner (D8). Assigned lists are read-only for the child.
Endpoints: `POST/GET/DELETE /api/spelling/assignments`, `GET /api/spelling/assigned-lists` (learner view).
**Done when:** a parent assigns "Week 6" to two children and sees each one's completion update after practice.

### F5 — Linking existing accounts (invites) — ✅ built (2026-10-14)
> Backend: migration `0015_invites.sql`, `lib/invites.ts`, `/api/spelling/family/invites[/:code/preview|accept]`, `/family/learners/:id/access[/:userId]`, `src/invites.test.ts`. Front end: `/join` and `/join/:code` (`JoinPage`), a Share dialog per child, "Make a code for a student", waiting codes with Cancel, "Grown-ups who can see your practice" with Remove; `invites.test.jsx`. Deploy: apply migration `0015` before the Worker.
> **Two kinds of code** (single use, 7 days, 8 characters from a look-alike-free alphabet): *share_child* (the parent gives another adult a child: a second parent or a teacher) and *link_me* (an adult follows a student who accepts with their own login; the student can remove them any time). Creating is limited to 10 a day; looking up 10 wrong codes in an hour blocks that user's lookups; a preview shows only the inviter's first name (or a masked email) and a child's first name.
> **Rule added:** a teacher, or anyone looking at another person's own account, can see and assign but **cannot record practice or change the grade** (`canActAsLearner`): the learner themselves, a child's owner and a child's guardian can. Unlinking removes access only; practice data is never deleted (D4).
Invite codes (D3, Q1) for: a second parent joining a child; an adult linking a student who has their own account; a parent granting a teacher view access. Accept at `/join/:code`. Either side can unlink; unlinking never deletes data (D4).
**Done when:** two adults see the same child, and a student with their own login shows up in an adult's list after accepting.

### F6 — Teacher / classroom — ✅ built (2026-10-14)
> Backend: migration `0016_classes.sql`, `lib/classes.ts`, `/api/spelling/groups/*`, class codes handled by the invite lookup (`join_class`), summaries and assignment progress rewritten as set-based SQL (a 40-student overview takes under 25 queries, tested), weekly email leaves class students to the class page and skips AI summaries for them, `src/classes.test.ts`. Front end: `/classes`, `/classes/:groupId` (sortable, filterable roster table, who needs a look, class-wide patterns, bulk add, class code, assign to class, rename/delete), `utils/classExport.js`, `utils/download.js`; tests `classes.test.jsx`, `classExport.test.js`. Deploy: apply migration `0016` before the Worker.
> **Exports:** class report as PDF (print) and HTML, each optionally with a full report per student after the class table; spreadsheet (CSV) following the on-screen filter and sort.
> **Not built (decide if you want them):** co-teachers sharing one class; moving students between classes in one step; a per-student note field; seeing a student's deck levels (they live only in the browser).
Groups of kind `class` (D5), roster bulk add (paste one name per line), class code for adding self learners, class report: a table of students × (sessions this week, assignment completion, top struggling words, active patterns) sortable and filterable, plus "class-wide patterns" (patterns active for ≥ 3 students). CSV export. **Class PDF report** plus one-click "all students" PDF (Q2). Consent note (D11).
**Done when:** a teacher with 25 students sees who has not practised, who is stuck, and which pattern to teach next, on one screen.

---

<a id="pdf-reports"></a>
## PDF reports (Q2)
For parent–teacher meetings. Built as a **print-ready page** that the browser saves as PDF (Print → Save as PDF; a "Download PDF" button calls `window.print()`). No PDF library on the Worker, no stored files, and it works offline from cached data.

* **Learner report** — `/family/:learnerId/report?from=&to=` (default: last 4 weeks). One to two A4/Letter pages:
  1. Header: learner name (first name + last initial), grade, date range, generated date (no emails or account ids).
  2. Summary tiles: sessions, minutes practised, words practised, words mastered, accuracy, trend vs previous period.
  3. Assignments: list name, due date, completion % (D8).
  4. Spelling patterns: active and cleared, with the cached AI pattern report summary and practice ideas.
  5. Hardest words (top 10 by friction) and recently mastered words.
  6. Simple weekly bar chart of sessions (inline SVG, prints in black and white).
  7. Space for adult notes (blank lines).
* **Class report** (F6) — `/class/:groupId/report`: page 1 is the class table and class-wide patterns; "All students" option appends one learner report per student with page breaks.
* Data: one call, `GET /api/spelling/supervisor/report?learner=&from=&to=`, requires `canViewReports`. Same access checks as every other learner route.
* Styling: `@media print` stylesheet (no header, nav or keyboard; fixed page size; `break-inside: avoid` on sections). Tested with a Playwright print-to-PDF snapshot.
* Not in scope: emailing the PDF, server-side generation. Revisit only if browsers' Save as PDF proves unreliable on phones.

---

## Security & privacy checklist
* Every learner route goes through `requireLearnerAccess`; tested by a route-table scan test.
* IDs in URLs are not credentials; unknown or unlinked = 404.
* Managed learners store first name + last initial, avatar key and grade only. No photos, no emails, no birthdays.
* PIN: hashed (PBKDF2, per-user salt), 5 wrong tries → 5-minute lockout.
* Invite codes: single use, 7-day expiry, rate-limited (10 per adult per day).
* Delete learner: soft delete, hidden at once, hard-delete job after 30 days removes attempts, scores, patterns, digests, sessions.
* Delete adult account: managed learners they *own* are deleted; learners they are only linked to are unlinked.
* AI quotas stay per adult, so adding children does not multiply the budget.
* Privacy page: add "Children" section for the spelling app before F2 ships (D11).

## Testing
* API (`api.test.ts`): access matrix — self / owner / guardian / teacher / stranger × every learner route; `word_scores` migration on a copy of real-shaped data; digest grouping.
* Client: `useLearner` switching, attempt queue grouping by learner, kid-mode route guard, PIN flow, assigned-list badges.
* Manual: two-child phone hand-off; offline practice as child A, switch to child B, reconnect — each child's attempts land correctly.

## Rough size
| Phase | Size |
|---|---|
| F1 | M — mostly careful refactor + one table rebuild |
| F2 | M |
| F3 | M (data already exists; PDF report adds S) |
| F4 | M |
| F5 | S |
| F6 | M–L (class PDF adds S) |
