# Spelling Tutor Architecture Overview

This document outlines the core architectural principles, invariants, and patterns used in the Spelling Tutor web & mobile app.

> [!CAUTION]
> **Hard Invariants — Cross-Cutting Rules**
> - **Base HREF Contract:** The app MUST always be configured with `base: '/spelling/app/'` to correctly resolve under the reverse-proxy at `goodplusfast.com/spelling/app/`.
> - **Unified Global CSS:** All UI colors, cards, and buttons must derive from the main Good Plus Fast design tokens (`--color-primary`, `--background`, `--foreground`). Never introduce hardcoded discordant color schemes.
> - **Graceful Local-First Fallback:** All spelling practice features MUST remain fully functional using `localStorage` if the user is unauthenticated or the backend API is unreachable.
> - **Session Cookie Auth:** Never store JWTs in `localStorage`. Authentication relies strictly on the `HttpOnly` session cookie issued by `goodplusfast.com`.
> - **AI Capacity Limits:** All Cloudflare Workers AI interactions must verify neuron caps against `ai_admin_config` before executing to prevent cost overruns.

---

## Quick Lookup Index

| Topic / Feature | Primary Architecture Doc | Key Class / Hook |
|---|---|---|
| Platform, Routing & PWA | [`01_platform_and_pwa.md`](./01_platform_and_pwa.md) | `VitePWA`, `spelling-proxy-worker.js` |
| Syllable Parsing & Hiding Engine | `02_syllable_engine.md` *(Phase 2)* | `useWordList`, `useHiding` |
| Cloudflare API & Session Sync | `03_auth_and_sync.md` *(Phase 3 & 4)* | `apiService`, `storageService` |
| AI Struggle Engine (Leech Hunter) | `04_ai_engine.md` *(Phase 5)* | `calculateFrictionScore`, Workers AI |
| Android & Mobile Packaging | `05_mobile_capacitor.md` *(Phase 7)* | Capacitor Android Bridge |

---

## Core Tech Stack
* **Frontend:** React 19, Vite 6, Tailwind CSS
* **PWA & Offline:** `vite-plugin-pwa` (Service Worker + Web App Manifest)
* **Audio Dictation:** Native Web Speech API (`window.speechSynthesis`)
* **Deployment:** Cloudflare Pages (`spelling-tutor.pages.dev`) reverse-proxied under `goodplusfast.com/spelling/app/*`
* **Backend API:** Hono running on Cloudflare Workers (`spelling-tutor-api`)
* **Database:** Cloudflare D1 (`spelling-tutor-db` joined with `good_plus_fast_db` for session verification)
* **AI Engine:** Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`)
