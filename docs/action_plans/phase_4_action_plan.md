# Phase 4 — Auth Integration + User Data Sync: Action Plan

> Parent plan: [spelling_tutor_launch_plan.md](../spelling_tutor_launch_plan.md#phase-4) | Depends on: Phase 2 (UI), Phase 3 (API + D1)
> Status: 🔲 Planned (open questions resolved 2026-09-26) | Recommended model: Claude Sonnet, High effort (Antigravity: Gemini Pro High)

**Goal:** Logged-in users get cloud-synced word lists and practice history; anonymous users keep working exactly as today on localStorage. The Progress page shows real scores from the API.

---

## 1. Findings from the repo review (things the launch plan didn't anticipate)

| # | Finding | Impact on Phase 4 |
|---|---------|-------------------|
| 1 | **No same-origin route to the API exists.** `spelling-tutor-api` has no `routes` in `wrangler.jsonc`; it lives on `*.workers.dev`. The `session` cookie is set on `goodplusfast.com` and browsers won't send it cross-origin. Flashy Cards solved this with an Astro proxy (`jerome-portfolio/src/pages/api/fc/[...path].js`) that reads the cookie and forwards `Authorization: Bearer <session>`. | **Blocking.** Must add `src/pages/api/spelling/[...path].js` in the Astro project. The Phase 4 launch-plan sketch (`fetch(..., credentials:'include')` straight to the Worker) would return 401 for everyone. |
| 2 | **`useAuth.js` was never built** (Phase 1 listed it; `Header.jsx` hard-codes "Local Mode", no login button). | Build it now, as a context provider. |
| 3 | **The API can only create lists.** `POST /lists` always inserts a new row; there's no update, rename or set-default. | Sync needs `PUT /lists/:id` and a default-list endpoint (see 4.1). |
| 4 | **Attempts have no idempotency.** A retried flush (offline, flaky network, double-fire on `pagehide`) would double-count and inflate friction scores. | Add a client-generated `client_id` + unique index (migration `0002`). |
| 5 | **`useWordList` is a single raw string** (`spelling_tutor_words_v4`); there's no concept of multiple lists. `WordCard` ids are `w_${word}_${random}` and re-randomise on every parse, so `useHiding`'s persisted `hiddenMap` is already stale-prone and will break outright when switching lists. | Introduce a lists model + v4→v5 migration; make word ids deterministic (`w_${index}_${word}`); reset hiding state on list switch. |
| 6 | **Attempts are only knowable at "Check".** `WordCard.handleVerify` produces per-letter `correct/incorrect` — that's the only correct capture point. Nothing is recorded today. | Add an `onAttempts` callback from `WordCard` → a queue hook. |
| 7 | `ProgressPage.jsx` already exists as a placeholder (launch plan lists it as NEW in Phase 5). No router — `App.jsx` uses `activePage` state. | Phase 4 fills in a basic dashboard; Phase 5 adds flame/AI tips on top. No router needed. |
| 8 | Phase 1's `useAuth` sketch calls `https://www.goodplusfast.com/api/auth/me`. Apex vs `www` cookie mismatch and Capacitor/pages.dev origins make an absolute URL fragile. | Use a configurable base: relative (`/api/...`) by default, `VITE_API_ORIGIN` for Capacitor (Phase 7). |
| 9 | **`/login` ignores `?redirect=` today**, even though `account.astro` and `admin/ai-credits.astro` already send users to `/login?redirect=/account` (so those links are silently broken too). Password login hard-codes `window.location.href = '/'` (`login.astro`), Google OAuth callback hard-codes `redirect('/')`, and the login/signup toggle links drop query params. The `session` cookie is confirmed `SameSite=Lax`. | Add a site-wide, sanitised `?redirect=` (step 4.2b). |
| 10 | **The app has no URLs of its own** — `App.jsx` switches pages with `useState`, so every screen is `/spelling/app/`. | Add a real router with unique, deep-linkable URLs (step 4.3a). Required by decision D1 below. |
| 11 | **Only `0001_initial_schema.sql` exists** in `spelling-tutor-api/migrations` (the launch plan's separate `0002_add_ai_scores` was folded into it; `word_scores` is already there). | The idempotency migration is `0002`, not `0003`. |
| 12 | The main site is an **Astro SSR app on the Cloudflare adapter, deployed as a Worker** (`good-plus-fast-website`, `wrangler.toml`), not Pages; its tests run with `node --test` (`tests/*.test.js`), not Vitest. Site env is read via `Astro.locals.runtime.env`. | Deploy step and test tooling for the Astro side corrected below. |
| 13 | The `spelling-tutor-api` code lives in the **Astro Project repo**, not this one. | Phase 4 touches three places: this repo, `Astro Project/apps/spelling-tutor-api`, `Astro Project/jerome-portfolio`. Commit each separately. |

---

## 2. Design decisions

| Decision | Choice | Reason |
|---|---|---|
| API transport | Same-origin Astro proxy `/api/spelling/*` → Worker; Bearer forwarded | Proven Flashy Cards pattern; avoids third-party cookie problems |
| Auth check | `GET /api/auth/me` (existing) via relative URL | Cookie is HttpOnly; no new auth infra |
| Conflict policy | **Last-write-wins per list**, keyed by list id; server `updated_at` is truth | Single-student, mostly single-device use; a merge engine is overkill |
| Local model | `lists[]` + `activeListId` in localStorage (`spelling_tutor_lists_v5`) always written, even when logged in | Offline-first: UI reads local, sync is background. Logged-out ≡ never synced. |
| Attempts | Local queue → batched flush, idempotent by `client_id` | Survives offline/expiry; no lost practice data |
| Anonymous attempts | Queue locally (cap 1000, drop oldest), upload on first login | Practice done before signing up still counts. *(Open Q1)* |
| Default list | Built-in default is virtual; only synced once the user edits/saves it | Avoids every new account getting a junk row |
| **D1. URLs** | Every screen and every list has its own URL under the app base `/spelling/app/`; nothing is served only from `/spelling` (that path is the marketing landing page, Phase 6). Deep links survive refresh, bookmarking, and login round-trips. | User requirement |
| **D2. List identity** | Lists get a **client-generated UUID v4 that is also the server primary key** (no separate `remoteId`). The list's URL is identical before and after sync and on every device. | Stable, unguessable URLs |
| **D3. Privacy of URLs** | URLs are *addresses, not credentials*. Access control is enforced server-side: every list/score query is scoped by `user_id`; another user's list id returns 404 (indistinguishable from "doesn't exist"). Local-only (anonymous) lists resolve only on the device that holds them. | Unguessable ids are defence in depth, not the security boundary |
| **D4. Login redirect** | Site-wide `?redirect=<path>` on `/login` (password, Google OAuth, signup toggle). Same-origin relative paths only. Login links on `/spelling*` and the app carry the current path+query. | User requirement |
| Tests | Add **Vitest** in the spelling app for pure logic only (migration, merge, queue); use the existing `node --test` runner in the Astro project for `safeRedirect` | Spelling repo has no runner; the sync logic is the risky part |

---

## 3. Work breakdown

Six steps, each ending in a verification gate. Steps 4.1–4.2 are backend/infra and should ship first; the frontend then builds on a live API.

### 4.1 API changes — `Astro Project/apps/spelling-tutor-api`

| Action | File | Notes |
|---|---|---|
| NEW | `migrations/0002_attempt_idempotency.sql` | `ALTER TABLE attempts ADD COLUMN client_id TEXT;` + `CREATE UNIQUE INDEX idx_attempts_client ON attempts(user_id, client_id) WHERE client_id IS NOT NULL;` |
| MODIFY | `src/index.ts` | See below |

Changes in `index.ts`:
- **`PUT /api/spelling/lists/:id`** — **upsert** (client-supplied UUID `:id`, validated `z.string().uuid()`): creates the row for this user if absent, otherwise updates `name`, `words_raw`, `is_default`; `updated_at = CURRENT_TIMESTAMP`. If the id exists under a *different* user → 404 (never reveal existence). Returns the row incl. server `updated_at`.
- **`GET /api/spelling/lists/:id`** — single list (owner only, else 404); used by deep links.
- **Security:** every statement stays scoped by `user_id`; add a cross-user access test. Clear other defaults in the same `db.batch` (currently a separate statement, non-atomic).
- **`POST /lists`** — accept optional client `id` (kept for compatibility); fix the same non-atomic default-clearing; enforce limits: max 25 lists/user, `words_raw` ≤ 20 KB, `name` trimmed.
- **`POST /attempts`** — accept optional `client_id` per attempt; `INSERT ... ON CONFLICT DO NOTHING`; validate `word` (`/^[a-z' -]{1,40}$/i`, lowercased) and `position < word.length`; batch the friction recompute (currently one history query + upsert per word in a loop — acceptable now, note for Phase 5). Return `{ recorded, duplicates, words_updated }`.
- Keep all changes **additive/backward-compatible** so the deployed Worker keeps working during rollout. Bump `/health` to `phase: 4`.
- Confirm the friction rows stay correct when duplicates are skipped (recompute from DB history, which it already does).

### 4.2 Same-origin proxy — `Astro Project/jerome-portfolio`

| Action | File | Notes |
|---|---|---|
| NEW | `src/pages/api/spelling/[...path].js` | Copy of `api/fc/[...path].js` (uses `export const GET/POST/PUT/DELETE/PATCH`, not `ALL`; `WORKER_BASE` prod = `https://spelling-tutor-api.good-plus-fast.workers.dev`, matching Flashy's `good-plus-fast` account subdomain); target `${WORKER_BASE}/api/spelling/${path}` (note: the Worker keeps the `/api/spelling` prefix, unlike Flashy Cards). Forward query string, method, body; add `Authorization: Bearer <session cookie>`; strip `host`/`cookie`. Dev base `http://localhost:8787`. |
| MODIFY | `WEBSITE_PAGES.md` | Document `/api/spelling/*` proxy route |

Also confirm: (a) the real deployed Worker URL (expected `spelling-tutor-api.good-plus-fast.workers.dev`), (b) the `session` cookie's `SameSite` attribute — with Lax, cross-site POSTs to the proxy won't carry it, which is the CSRF protection we rely on. Add a one-line note to the doc either way.

### 4.2b Login redirect — `Astro Project/jerome-portfolio`

Goal: choosing **Log in** from any `/spelling…` URL returns the user to *exactly that URL* (path + query + hash) after login.

| Action | File | Notes |
|---|---|---|
| NEW | `src/lib/safeRedirect.js` | `safeRedirect(value, fallback='/')`: accept only strings ≤ 512 chars that start with a single `/` (reject `//`, `/\`, any scheme, backslashes, control chars); decode once and re-check; otherwise return fallback. Tested with `node --test` in `jerome-portfolio/tests/safe-redirect.test.js` (existing runner) with open-redirect payloads (`//evil.com`, `/\evil.com`, `https://evil.com`, `javascript:`, `%2F%2Fevil.com`). |
| MODIFY | `src/pages/login.astro` | Read `redirect` from the query; preserve it in the login/signup toggle links (lines ~42, 203, 229); pass it to the Google button (`/api/auth/google?mode=…&redirect=…`); on password-login success use `safeRedirect(param)` instead of `'/'` (line ~439). |
| MODIFY | `src/pages/api/auth/google.js` | Read + sanitise `redirect`; store in an HttpOnly, `SameSite=Lax`, 10-min `login_redirect` cookie alongside `oauth_state`. |
| MODIFY | `src/pages/api/auth/callback.js` | On success read + re-sanitise `login_redirect`, clear it, `redirect(target, 302)` (currently `'/'`, line ~184). Error paths keep current behaviour. |
| MODIFY | site header login links (`components/islands/AuthNav.jsx`, `MobileMenu.jsx`; grep `/login` for others) | Both the **Log in** (`AuthNav.jsx:91`, `MobileMenu.jsx:188`) and **Sign up** (`:97`, `:196`) links become `/login?mode=…&redirect=<encodeURIComponent(location.pathname + search + hash)>` (client islands, so `location` is available; skip on `/login` itself). This is what makes "Log in from `/spelling`" return to `/spelling`. |
| OPTIONAL | `account.astro`, `admin/ai-credits.astro` (already send `?redirect=`), `job-campaign/interview/*` (send bare `/login`) | The first two start working for free; the interview pages could adopt it later — out of scope. |
| — | Known limitation | New-account **email verification** links open from an email (possibly another device) and won't carry the redirect; they land on `/` as today. |

The React app's own Log in links use the same shape: `https://www.goodplusfast.com/login?redirect=` + current `location.pathname + search + hash` (use the `www` host that owns the cookie).

**Gate 4.1/4.2 (curl/Postman, real session):** `GET /api/spelling/lists` → `[]`; POST → 201; PUT → updated; same-`client_id` attempts posted twice → second reports duplicates and score unchanged; no cookie → 401; another user's list id → 404 on GET, PUT and DELETE; PUT with a fresh UUID creates the list.

**Gate 4.2b:** from `/spelling/app/lists/<id>` click Log in → (password, then Google) → land back on that exact URL; `?redirect=//evil.com`, `https://evil.com`, `javascript:alert(1)` all land on `/`; toggling login/signup keeps the param.

### 4.3a Routing & URL scheme — this repo

Add `react-router-dom` (`BrowserRouter basename={import.meta.env.BASE_URL}` → `/spelling/app`). Replace the `activePage` state in `App.jsx` and `Header` with `NavLink`s.

| URL (under `/spelling/app`) | Screen | Notes |
|---|---|---|
| `/` | Redirect (`replace`) to the last-used list's URL, or `/lists/default` | Last list remembered in localStorage |
| `/lists` | List manager index (all lists; create/rename/delete) | Anonymous: local lists only |
| `/lists/default` | Practice on the built-in default list | Virtual, never synced until edited (then it becomes a real UUID list and the URL is replaced) |
| `/lists/:listId` | Practice on that list | `:listId` = UUID (D2). Unknown or not-yours → one "List not found" page (D3) with links to `/lists` and Log in |
| `/progress` | Progress dashboard (all words) | Optional `?list=<id>` filter |
| `/progress/words/:word` | *Reserved for Phase 5* (per-word history + AI tip) | Stub route |
| `*` | Not-found page | |

Supporting changes:
- **SPA fallback on Cloudflare Pages:** add `public/_redirects` with `/* /index.html 200`. The proxy Worker already forwards any `/spelling/app*` path (stripping the prefix), so deep links reach Pages. Add PWA `navigateFallbackDenylist: [/^\/api\//]`.
- **Deep-link resolution:** `/lists/:listId` checks localStorage first; if absent and authenticated, `GET /api/spelling/lists/:id`; a 404 shows the not-found page. While auth is `loading` show a skeleton (no not-found flash).
- The **active list is derived from the URL**, not state. Selecting a list navigates to its URL; "Save as…" generates the UUID and navigates to it. After login the redirect lands on the same list URL, which resolves from the server if it was created on another device.
- Move focus to the page heading and set `document.title` on route change (accessibility).
- Check the scheme against Phase 6 (Astro `/spelling/app/*` proxy) and Phase 7 (Capacitor origin/history mode); record in `01_platform_and_pwa.md`.

### 4.3 Auth in the React app — this repo

| Action | File | Notes |
|---|---|---|
| NEW | `src/services/apiService.js` | `apiFetch(path, opts)` — base from `import.meta.env.VITE_API_ORIGIN ?? ''`, `credentials: 'include'`, JSON handling, typed errors (`AuthError` on 401, `NetworkError`, `ApiError`). Timeouts via `AbortController` (10 s). Exposes `getMe`, `getLists`, `saveList`, `updateList`, `deleteList`, `postAttempts`, `getScores`. |
| NEW | `src/hooks/useAuth.jsx` | `AuthProvider` + `useAuth()`. State: `status` = `loading \| anonymous \| authenticated \| expired`, `user`. Calls `/api/auth/me` on mount and on `window` `focus` / `visibilitychange` (so logging in in another tab is picked up). Any `AuthError` from apiService flips to `expired`. |
| NEW | `src/components/AuthBanner.jsx` | Anonymous: "Log in to save your word lists and progress" + Log in link. Expired: "Your session expired — your work is saved on this device. Log in to sync." Dismissible per session (sessionStorage). Uses `role="status"`. |
| MODIFY | `src/components/layout/Header.jsx` | Replace "Local Mode" with: loading → nothing; anonymous → "Log in" link; authenticated → name/email + "Synced" indicator; expired → "Log in again". |
| MODIFY | `src/App.jsx` | Wrap in `AuthProvider`; render `AuthBanner` above page content. |
| MODIFY | `vite.config.js` | Dev proxy: `server.proxy` for `/api` → `http://localhost:4321` (Astro dev) so relative URLs work at `localhost:5173`. Ensure workbox `navigateFallbackDenylist: [/^\/api\//]` (API is outside the SW scope `/spelling/app/`, but make it explicit). |

Login link: `https://www.goodplusfast.com/login?redirect=<current path+search+hash>` (see 4.2b); the `focus` re-check remains as a fallback for logging in from another tab.

### 4.4 Data layer — this repo

| Action | File | Notes |
|---|---|---|
| NEW | `src/services/storageService.js` | Pure local persistence for lists (v5 schema) + v4→v5 migration (existing `spelling_tutor_words_v4`/v3/v2 logic moves here). List shape: `{ id /* UUID = server id */, name, wordsRaw, isDefault, updatedAt, dirty, deleted? }`. |
| NEW | `src/services/syncService.js` | `pullAndMerge(localLists, remoteLists)` (pure, unit-tested) and `pushDirty()`. Rules: remote-only → add locally; local-only (server lacks the id) → `PUT /lists/:id` upsert; both → newer `updatedAt` wins; local `deleted` → DELETE remote then purge. First login with remote empty + local custom lists → upload them. |
| NEW | `src/services/attemptQueue.js` | localStorage queue `spelling_tutor_attempt_queue_v1`. `enqueue(attempts)` assigns `client_id` (`crypto.randomUUID()`); `flush()` sends in chunks ≤ 400 (server cap 500), removes only the acknowledged chunk; exponential backoff on failure; drops on 400 (poison) after logging. |
| NEW | `src/hooks/useSync.js` | Orchestrates: on `authenticated` → pull lists + scores, flush dirty lists + attempt queue; triggers on `online`, `visibilitychange→hidden` (use `fetch keepalive`, body < 64 KB), 30 s interval while dirty, and Progress-tab open. Exposes `syncStatus: idle \| syncing \| error \| offline` and `lastSyncedAt`. |
| MODIFY | `src/hooks/useWordList.js` | Keep existing return (`rawList`, `words`, `importWords`, `resetToDefault`) so `PracticePage` keeps working; add `lists`, `activeListId`, `selectList`, `saveListAs(name)` (generates the UUID), `renameList`, `deleteList`. The active list comes from the route param. Reads/writes via `storageService`; marks lists `dirty` on change. Word ids become deterministic (`w_${index}_${word}`). |
| MODIFY | `src/hooks/useHiding.js` | Reset `hiddenMap` when `activeListId` changes. |
| NEW | `src/components/WordListManager.jsx` | Select (accessible `<select>` with label) of lists; "Save as…", rename, delete (with confirm), sync status chip. Shown in the Practice toolbar next to Import. Anonymous users see it too (local lists) — just no cloud chip. |
| MODIFY | `src/components/WordCard.jsx` | `handleVerify` calls new `onAttempts(word.word, [{letter, position, correct}])` prop. Only hidden letters that were checked are recorded. Re-checking after a wrong answer records again (that is the "consecutive misses" signal the friction algorithm wants). Empty inputs count as incorrect (existing behaviour). |
| MODIFY | `src/components/WordList.jsx`, `src/pages/PracticePage.jsx` | Thread `onAttempts` through; mount `WordListManager`; call `useSync`. |

**Attempt capture detail:** `position` is the global letter index (matches `word_scores` friction logic and the API's `position < word.length` check); `word` is the lowercased full word (`word.word`), *not* `raw`, so phonetic overrides like `(prit-tee)` never leak into the DB.

**Gate 4.3/4.4 (local, two browsers):** see §5.

### 4.5 Progress page — this repo

| Action | File | Notes |
|---|---|---|
| MODIFY | `src/pages/ProgressPage.jsx` | Anonymous → explanation + Log in CTA (and a local-only "attempts queued on this device: N" line). Authenticated → summary cards (words practiced, overall accuracy = 1 − errors/attempts, needs-work count) and a sortable table/list of words: word, attempts, accuracy, friction score, last practiced. Sorted by friction desc by default. Loading skeleton, empty state ("Practice a few words and press Check"), error state with Retry. Flush the queue *before* fetching so the page reflects the latest session. |
| — | (deferred to Phase 5) | Flame icon on `WordCard`, `AITipModal`, mastered-resets logic. Phase 4 only renders `friction_score` numerically/with a simple bar. |

Accessibility: table has `<caption>`/headers, bar charts have text equivalents, status changes announced via `aria-live="polite"`, all banners/buttons keyboard reachable and contrast-checked in dark mode.

### 4.6 Docs, tooling, release

| Action | File | Notes |
|---|---|---|
| NEW | `docs/architecture/04_auth_and_sync.md` | Auth flow diagram (browser → Astro proxy → Worker → GPF DB), local-first sync rules, conflict policy, queue semantics, failure modes |
| MODIFY | `docs/architecture/03_backend_and_schema.md` | New endpoints (`PUT /lists/:id`), `client_id` column, limits |
| MODIFY | `docs/architecture/01_platform_and_pwa.md` | URL scheme table, SPA fallback, Capacitor/Phase 6 implications |
| MODIFY | `docs/architecture/00_overview.md` | Add link + invariants: "UI always reads localStorage; sync is background", "attempts are idempotent" |
| MODIFY | `docs/spelling_tutor_launch_plan.md` | Mark Phase 4 status; fix the sketch that calls the Worker directly |
| MODIFY | `package.json` | `vitest` devDependency + `"test": "vitest run"` |
| NEW | `src/services/*.test.js` | Migration v4→v5, `pullAndMerge` cases, queue chunking/idempotency/backoff |
| NEW (optional) | `tools/05.launch_dev_full.bat` | Starts `wrangler dev` (API), Astro dev, and Vite together |

**Deploy order** (each step is backward compatible with the previous):
1. Apply migration: `npx wrangler d1 migrations apply spelling-tutor-db --remote`
2. `npx wrangler deploy` (API Worker)
3. Deploy the Astro site (proxy route + login redirect). The site is a Cloudflare Worker built from the `Astro Project` repo — recent commits ("trigger build", "deploying spelling_tutor") suggest a git-push-triggered Cloudflare build; confirm before relying on it
4. Run curl gate against production
5. `tools/03.publish_web_to_cloudflare.bat` (React app)

Commits: one per repo, format `feat(spelling-tutor): Phase 4 — Auth Integration + User Data Sync`.

---

## 4. Risks & edge cases

| Risk | Mitigation |
|---|---|
| Session expires mid-practice | `AuthError` → `expired` state; all writes continue locally, marked dirty; banner; auto-resync on re-login (focus check) |
| Double-counted attempts on retry / two tabs | `client_id` + unique index; queue chunk removed only on ack |
| Two devices edit the same list offline | Last-write-wins by `updatedAt`; documented limitation; no silent deletion (a locally-deleted list only deletes remotely if it still exists) |
| localStorage unavailable (private mode) | All accessors wrapped in try/catch (existing pattern); in-memory fallback; sync still works for logged-in users |
| Clock skew between devices | Compare against server-returned `updated_at` after each push, not device time, where possible |
| Poison attempts (400) block the queue | Drop after one 400, log; never retry infinitely |
| Kid at a shared device logs into parent's account | Out of scope; note for Phase 8 docs |
| `useHiding` stale ids after list switch | Deterministic ids + reset on list change (4.4) |
| Worker cold-path latency on Progress page | Skeleton + cached last-known scores in memory |

---

## 5. Manual verification checklist

**Backend**
- [ ] Migration `0002` applied; unique index present in D1 console
- [ ] `PUT /lists/:id` updates; other user's id → 404
- [ ] Duplicate `client_id` attempts ignored; friction score unchanged
- [ ] Proxy: `GET /api/spelling/lists` on `goodplusfast.com` with session → `[]`; incognito → 401

**Anonymous**
- [ ] Fresh browser: default list shows; import a list; refresh → persists
- [ ] Header shows "Log in"; banner shown once per session and dismissible
- [ ] Existing v4 localStorage data migrates to a list named "My Words" with no data loss
- [ ] Check answers → attempts queue count increases on Progress page

**URLs & redirect**
- [ ] Every screen has its own URL; refresh on `/lists/<id>`, `/lists`, `/progress` works locally, on `spelling-tutor.pages.dev`, and via `goodplusfast.com/spelling/app/…`
- [ ] Back/forward move between screens; switching lists changes the URL
- [ ] Click Log in from a `/spelling…` page (site header until Phase 6's landing page exists) → return to that same URL, for both password and Google login
- [ ] Log in from `/spelling/app/lists/<id>` on a second device → same list opens
- [ ] As user B, open user A's list URL → "List not found" (identical to a random UUID); API returns 404
- [ ] A list URL that exists only on another anonymous device → not-found page, no crash
- [ ] Open-redirect payloads rejected (gate 4.2b)

**Logged in**
- [ ] Log in in a second tab → first tab flips to authenticated on focus, no reload
- [ ] Custom local lists + queued attempts upload once; no duplicates after refresh
- [ ] Save list → hard refresh → present; second browser/device shows it too
- [ ] Rename/delete propagate; cannot exceed 25 lists (friendly error)
- [ ] Practice, press Check → Progress shows attempted words with sensible accuracy/friction
- [ ] Go offline (DevTools) → keep practicing → back online → queue flushes, scores update
- [ ] Delete the session row / wait for expiry → "session expired" banner, practice continues, log back in → syncs
- [ ] Phonetic-override word (`pret-ty (prit-tee)`) stored as `pretty`

**General**
- [ ] `npm run test` and `npm run build` pass; no console errors
- [ ] Dark mode + mobile Safari/Chrome: banner, list manager, progress table readable and usable
- [ ] Keyboard-only: manager, banner, Progress table reachable; announcements audible in a screen reader
- [ ] PWA: installed app works offline for practice; API calls fail gracefully, don't break the SW

---

## 6. Resolved questions

1. Anonymous attempts: **upload the on-device queue on first login.**
2. Login redirect: **build it site-wide** (4.2b), returning users to the exact `/spelling…` URL; unique URLs for every screen and list (D1–D3, 4.3a).
3. List cap: **25 lists / 20 KB each: approved.**
4. Worker URL: **assumed `spelling-tutor-api.good-plus-fast.workers.dev`: approved**; confirm against the `wrangler deploy` output before writing the proxy.
5. **Vitest: approved** (spelling app only; Astro project keeps `node --test`).

---

## 7. Suggested session split

Given the three-repo footprint, run it as two sessions with a commit between them:
- **Session A (Steps 4.1, 4.2, 4.2b, backend gate, deploy):** API + proxy + login redirect — security-sensitive, verify with curl before any UI work.
- **Session B (Steps 4.3a–4.6):** frontend, sync, progress page, docs.
