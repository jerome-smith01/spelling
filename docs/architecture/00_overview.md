# Spelling Tutor Architecture Overview

This document outlines the core architectural principles, invariants, and patterns used in the Spelling Tutor web & mobile app.

> [!CAUTION]
> **Hard Invariants — Cross-Cutting Rules**
> - **Base HREF Contract:** The app MUST always be configured with `base: '/spelling/app/'` to correctly resolve under the reverse-proxy at `goodplusfast.com/spelling/app/`.
> - **Unified Global CSS:** All UI colors, cards, and buttons must derive from the main Good Plus Fast design tokens (`--color-primary`, `--background`, `--foreground`). Never introduce hardcoded discordant color schemes.
> - **Graceful Local-First Fallback:** All spelling practice features MUST remain fully functional using `localStorage` if the user is unauthenticated or the backend API is unreachable.
> - **Local-first UI, background sync:** The UI always reads/writes `localStorage`; cloud sync is background work that may fail without affecting practice. Attempts are idempotent (`client_id`).
> - **Unique URLs:** Every screen and every list has its own URL under `/spelling/app/` (see `04_auth_and_sync.md`); list ids are UUIDs and access is enforced server-side.
> - **Session Cookie Auth:** Never store JWTs in `localStorage`. Authentication relies strictly on the `HttpOnly` session cookie issued by `goodplusfast.com`.
> - **Uploads are never stored:** homework photos are validated, re-encoded in the browser, held in memory for one model call and discarded. All AI output (words, titles, hints) is parsed, validated, length-clamped and rendered as text.
> - **A user is not a learner (family accounts).** A *user* logs in; a *learner* practices. Every user is also their own `self` learner (`learner_id = user_id`), and a child or class student is a `managed` learner owned by an adult, with no login. Practice data (attempts, scores, patterns, grade, digest) is keyed by `learner_id`; lists, settings and the AI budget stay with the logged-in user. A request names the learner in `X-Spelling-Learner`; the server checks `learner_access` and answers 404 for anything the user may not act for, exactly as for something that does not exist (see `03_backend_and_schema.md`, `04_auth_and_sync.md`).
> - **Reports are for grown-ups.** A child in kid mode sees their own progress but never reports (weekly summary, pattern reports, exports). Nothing about a child is ever sent by email: the weekly email is only a link to the dashboard.
> - **Children are a first name and a last initial.** "Ava S.", an avatar and a grade: never a full last name, email, link or phone number (`nicknameProblem`, `lib/family.ts`). Deleting a child hides them at once and removes their data after 30 days.
> - **Kid mode and the PIN are a lock for a child, not security.** Kid mode is enforced in the app; the PIN is hashed and rate-limited on the server, but a 4-digit PIN protects nothing beyond a child on a parent's device.
> - **Kid-facing UI is quiet and visual.** No helper or explanatory sentences in the quiz; show results with boxes, colors and icons, with "Your spelling" before "Correct spelling", big icon buttons, and one primary action per screen. In-progress state (quiz round, play speed) survives a refresh and is saved per device and learner. The per-word result and the end-of-round summary have **one format** shared by quiz and practice (`SpellingResult`, `RoundSummary`): change those, never fork them. Details and the full rule list: `07_quiz_and_keyboard.md`.
> - **AI Capacity Limits:** All Cloudflare Workers AI interactions must verify the kill switch and neuron cap in the shared `ai_admin_config` (in `good_plus_fast_db`) before executing, including fire-and-forget auto-triggers to prevent cost overruns.

---

## Quick Lookup Index

| Topic / Feature | Primary Architecture Doc | Key Class / Hook |
|---|---|---|
| Platform, Routing & PWA | [`01_platform_and_pwa.md`](./01_platform_and_pwa.md) | `VitePWA`, `spelling-proxy-worker.js` |
| Syllable Parsing & Hiding Engine | [`02_syllable_engine.md`](./02_syllable_engine.md) | `useWordList`, `useHiding` |
| Cloudflare API & D1 Schema | [`03_backend_and_schema.md`](./03_backend_and_schema.md) | `spelling-tutor-api`, `spelling_db` |
| Auth, URLs & User Data Sync | [`04_auth_and_sync.md`](./04_auth_and_sync.md) | `useAuth`, `useLists`, `syncService`, `attemptQueue` |
| Struggle & Pattern Engine, shared AI quota | [`05_ai_engine.md`](./05_ai_engine.md) *(Phase 5)* | `scoring.ts`, `patternTagger.ts`, `useStruggle` |
| Smart hiding, auto-syllables, photo import, profile & generated words | [`05_ai_engine.md` §11](./05_ai_engine.md) · [plan](../action_plans/smart_hiding_ai_plan.md) | `smartHide.js`, `ChoicePicker`, `HarveyBall`, `PhotoImport`, `ProfilePage`, `photoImport.ts`, `generateWords.ts` |
| Family & classroom accounts (learners, kid mode and PIN, assignments, invite codes, classes, reports) | [`04_auth_and_sync.md` §6b](./04_auth_and_sync.md) · [`03_backend_and_schema.md`](./03_backend_and_schema.md) · [plan](../action_plans/family_and_classroom_plan.md) | `useLearner`, `activeLearner.js`, `lib/learners.ts`, `family.ts`, `assignments.ts`, `invites.ts`, `classes.ts`, `supervisor.ts`, `reportHtml.js`, `classExport.js` |
| Quiz mode, end-of-quiz review & drilling, on-screen keyboard, kid-facing UI principles | [`07_quiz_and_keyboard.md`](./07_quiz_and_keyboard.md) | `QuizView`, `KeyboardFrame`, `VirtualKeyboard`, `alignCells`, `recentPct` |
| Text-to-Speech Decision | [`06_tts_decision.md`](./06_tts_decision.md) *(Phase 7)* | Kokoro pre-gen + R2, `speechSynthesis` fallback |
| Android & Mobile Packaging | *(deferred — see Phase 7 note in launch plan)* | Capacitor Android Bridge |

---

## Core Tech Stack
* **Frontend:** React 19, Vite 6, Tailwind CSS
* **PWA & Offline:** `vite-plugin-pwa` (Service Worker + Web App Manifest)
* **Audio Dictation:** Native Web Speech API (`window.speechSynthesis`)
* **Deployment:** Cloudflare Pages (`spelling-tutor.pages.dev`) reverse-proxied under `goodplusfast.com/spelling/app/*`
* **Backend API:** Hono running on Cloudflare Workers (`spelling-tutor-api`)
* **Database:** Cloudflare D1 (`spelling-tutor-db` joined with `good_plus_fast_db` for session verification)
* **AI Engine:** Cloudflare Workers AI: `@cf/meta/llama-3.2-3b-instruct` (tips, reports, syllables, generated words; replaced the retired llama-3.1-8b-instruct) and `@cf/meta/llama-3.2-11b-vision-instruct` (homework photo import)
* **Local layout testing:** `npm run dev:mock` serves a fake logged-in API (`tools/devMockApi.js`); `tools/01.launch_dev.bat` uses it, `tools/07.launch_dev_real.bat` runs the real Astro site
