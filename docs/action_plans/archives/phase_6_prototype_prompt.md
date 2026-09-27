# Phase 6 — Astro Landing Page + Proxy Verification

Two parts: (A) the plan (for you), (B) a self-contained prompt to paste into another AI tool for the early prototype. Come back to Claude to finalize (checklist in part C).

---

## A. Plan

**Goal:** Ship `goodplusfast.com/spelling/` as a marketing landing page inside the Astro site (modeled on `/bible/`), and confirm `/spelling/app/*` resolves to the deployed React PWA in production.

### Findings (verified against the Astro project)
1. **Proxy precedent is "both", so keep both.** Pray the Bible uses the edge Worker (`ptb-proxy-worker.js` + toml) *and* the Astro route `src/pages/bible/pwa/[...path].ts`. Spelling already has its Worker files at `Astro Project/spelling-proxy-worker.js` and `spelling-proxy-wrangler.toml`. Follow the precedent: add the Astro route as a fallback; it is harmless if the Worker runs first. **Confirmed deployed:** `spelling-proxy` is live in Cloudflare with routes `goodplusfast.com/spelling/app*` and `www.goodplusfast.com/spelling/app*` (deployed via Wrangler, about 1 day before this check, 20 invocations and 0 errors in 24h). Observability is disabled (optional to enable for debugging).
2. **SSR is already set up.** `astro.config.mjs` uses `output: 'server'` with the adapter chosen by `ADAPTER` (default `cloudflare`), and `wrangler.toml` serves `dist/_worker.js`. The bible route uses `export const ALL` with no `prerender` flag; the bible landing page uses `export const prerender = true`. Copy both conventions. The bible route reads the body with `await request.arrayBuffer()` (the Worker uses `request.body`).
3. **Site conventions to reuse:** `import Layout from '~/layouts/Layout.astro'`, `Icon` from `astro-icon/components` (`fa6-solid:*`, `fa6-brands:*`), Tailwind theme-token classes (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-muted`), the `app-title font-display` gradient title, and the bible hero's CSS phone frame (280x580, `rounded-[3rem]`, thick border, notch). `<Layout title description>` has a `slot="head"` for extra head tags.
4. **Nothing spelling-related exists yet** in `jerome-portfolio/src/pages/` (`spelling/` absent), `apps.astro` (Phase 8) or `WEBSITE_PAGES.md` (only lists `bible/pwa/[...path].ts`).
5. **PWA icons missing** in the spelling repo (`public/icons/`), though `vite.config.js` references them.
6. **Copy must match reality.** Phases 4/5 (sync, AI coaching) aren't built: mark "Coming soon".
7. The Astro Project is its own git repo, so Phase 6 commits go there, separate from `spelling_tutor`.

### Tasks
1. Read `bible/index.astro` (280 lines) and `layouts/Layout.astro`; copy structure and classes.
2. Create `src/pages/spelling/index.astro`: Hero, Features (3 cards), How It Works (3 steps), Parents/Accessibility, final CTA.
3. Build the phone mockup as pure HTML/CSS (no image) showing a word card with `con-`[ ]`-`[ ]`-`rol` hidden-letter boxes.
4. SEO: title, meta description, canonical, OG/Twitter tags, `SoftwareApplication` JSON-LD.
5. Add `src/pages/spelling/app/[...path].ts` (copy of the bible route with `PAGES_HOSTNAME = 'spelling-tutor.pages.dev'` and the `/spelling/app` prefix); verify `/spelling/app` → 301 → `/spelling/app/`, deep links, assets, `sw.js` and `manifest.webmanifest` load through the proxy.
6. Add sitemap entry; update `WEBSITE_PAGES.md`; update `docs/architecture/01_platform_and_pwa.md`.
7. Accessibility pass: landmarks, heading order, contrast in both themes, focus rings, reduced-motion for the gradient title.

### Verification
- [ ] `/spelling/` loads (desktop + iPhone + Android widths), dark mode follows site theme
- [ ] "Open App" → `/spelling/app/`, app fully functional there
- [ ] `/spelling/app` (no slash) redirects with 301
- [ ] Hard refresh on an in-app route doesn't 404
- [ ] Lighthouse: Accessibility ≥ 95, SEO ≥ 95
- [ ] No claims of features that aren't shipped

**Model:** Sonnet, medium effort is enough now that the proxy question is settled.

---

## B. Prompt for the other AI tool (paste everything in the block)

````text
You are prototyping a marketing landing page for an existing app. Work in the Astro
project at "C:/Users/Jerom/My Apps/Astro Project/jerome-portfolio". This is an EARLY PROTOTYPE: prioritize a working,
good-looking page that reuses existing site patterns over polish. Do not modify
anything outside the files listed below.

## Context
- App: "Spelling Tutor", a React + Vite PWA for 3rd-grade spelling practice.
  Kids see a word broken into syllables, letters are progressively hidden, and they
  type the missing letters (auto-advance, smart backspace). A speaker button reads
  the word aloud. Parents import word lists by pasting hyphenated text
  (e.g. "con-trol") and can copy a ready-made AI prompt to convert a photo of the
  weekly list into that format. Works offline (PWA). Android app is planned.
- The app itself is deployed and lives at /spelling/app/ (already proxied; DO NOT
  touch or re-implement it).
- The landing page lives at /spelling/ in the Astro site.
- Planned-but-NOT-yet-built features: cloud sync of word lists, progress
  dashboard, and AI coaching tips for hard words. Label these "Coming soon".
  Do not claim they work today.

## Step 1 — Study before writing (required)
Read src/pages/bible/index.astro (the model page) and src/layouts/Layout.astro.
Reuse exactly: `import Layout from '~/layouts/Layout.astro'`, `Icon` from
'astro-icon/components' (fa6-solid / fa6-brands icons), `export const prerender = true`,
the `<Layout title description>` props, `slot="head"` for extra head tags, Tailwind
theme-token classes (bg-background, text-foreground, text-muted-foreground,
bg-primary, border-muted), and the `app-title font-display` gradient title. Build the
phone mockup in the same style as the bible hero frame (280x580, rounded-[3rem],
thick border, notch). Do NOT hardcode a new color scheme. Report which patterns
you reused.

## Step 2 — Create src/pages/spelling/index.astro (only this file)
Sections, in order:
1. Hero: title "Spelling Tutor" (animated gradient class), tagline
   "Practice weekly spelling words, syllable by syllable.", primary CTA button
   "Open App" -> /spelling/app/, secondary link "How it works" (anchor).
   Right/below: a phone mockup built in pure HTML/CSS (no images) showing a word
   card for "control": syllables "con" and "trol" with some letters shown and some
   rendered as empty input boxes, plus a speaker icon button.
2. Features: 3 cards — "Syllable Practice", "Progress Tracking" (Coming soon),
   "AI Coaching" (Coming soon). One-sentence description each.
3. How It Works: 3 numbered steps — (1) Paste or import your weekly word list,
   (2) Hide letters and type them from memory, (3) Hear the word, get instant
   feedback.
4. For Parents: explains the copy-paste AI prompt for importing word lists from
   a photo; badges "Works offline" and "Android coming soon".
5. Final CTA repeating "Open App".

## Requirements
- Responsive: verify at 375px, 768px, 1280px. No horizontal scroll.
- Both light and dark themes must look right and meet WCAG AA contrast.
- Semantic HTML: one <h1>, ordered headings, <main>/<section> landmarks,
  visible :focus-visible rings, buttons/links are real <a>/<button>.
- Respect prefers-reduced-motion (disable the gradient animation).
- Font/typography: whatever the /bible/ page uses.
- SEO in <head>: title, meta description, canonical
  https://www.goodplusfast.com/spelling/, Open Graph + Twitter tags, and
  JSON-LD SoftwareApplication (applicationCategory "EducationalApplication",
  operatingSystem "Web", offers price 0).
- No new npm dependencies. No client-side JS unless truly needed.
- Do NOT register a service worker on this page (the PWA scope is /spelling/app/).
- Do NOT create a proxy route; that is handled separately. Do not edit
  apps.astro or WEBSITE_PAGES.md.

## Deliverable / final message
1. List of files created/changed.
2. Which existing components/classes you reused.
3. Anything you were unsure about or assumed.
4. Screenshots or a description at the three widths, light and dark.
````

---

## C. When you return to Claude to finalize
Bring back: the generated `index.astro` and screenshots. Then we will:
- Add and verify the Astro proxy route, and confirm the Worker is deployed.
- Review for reuse vs. duplication, a11y, SEO, and honest copy.
- Add `WEBSITE_PAGES.md` and architecture doc updates, sitemap entry, and the commit message.
