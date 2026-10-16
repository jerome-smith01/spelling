# Guidance for AI coding tools

Read `docs/architecture/00_overview.md` first (hard invariants and a topic index), then the doc for the area you are changing. This file is the short version of the working rules.

## How we work here
* **Branches:** develop on the feature branch you were given and push there; after each push, `git fetch` and `git pull` that branch in the session so the user can pull it and see it on localhost. Merge to `main` only when the user asks; every push to `main` deploys the live site (`.github/workflows/deploy.yml`).
* **Edit surgically.** Change the lines that need changing; do not rewrite whole files. If a from-scratch rewrite is truly needed, ask first.
* **Verify:** `npm ci`, `npx vitest run`, `npm run build`. Add a test with each behavior change. For layout, look at it in a real browser (`vite preview` + headless Chromium; use touch emulation for the on-screen keyboard).
* **Update the docs in the same change** (`docs/architecture/`), including the principles below if they change.

## UI principles (children are the users)
* Keep text short. No helper or explanatory paragraphs on the quiz; use boxes, colors and icons.
* "Your spelling" is always shown before "Correct spelling". Correct word = one green box; student's letters = per-letter boxes (green right, red wrong, empty dashed red for a left-out letter).
* Large buttons, each with an icon, one clear primary action per screen.
* Enter moves forward (check, then next word).
* A child who rushes past a mistake gets the escalating "take time to review your work" popup (informational, then tap the wrong letter, then fix it); it is centered on screen and never covers the keyboard. Rules in `07_quiz_and_keyboard.md` §9.
* Never lose in-progress work: persist it to `localStorage` per learner (try/catch) and restore it on refresh; keep the URL in sync with the screen (`?mode=quiz`).
* Remember the student's choices (e.g. last play speed).
* Screens that scale with the viewport have a maximum width; do not add drag/resize/pin layout controls.
* Colors come from the design tokens in `src/styles/design-tokens.css`; selected states use an outline, not a lighter fill.

Full detail for the quiz and keyboard: `docs/architecture/07_quiz_and_keyboard.md`.
