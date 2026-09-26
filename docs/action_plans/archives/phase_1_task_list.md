# Spelling Tutor — Phase 1 Task List
> Feature: Standalone React App (Vite + PWA shell)
> Status: Complete

## Phase 1.1 Foundation & Design System
- [x] Create `src/styles/design-tokens.css` with GPF CSS variables (`--background`, `--foreground`, `--muted`, `--muted-foreground`, etc.) based on `theme.css`.
- [x] Create `src/styles/global.css` importing design tokens, configuring system font stack, resets, transitions, and button feedback.
- [x] Implement `src/hooks/useTheme.js` for dark/light mode toggle with `localStorage` persistence and `.dark` class management on `document.documentElement`.

## Phase 1.2 Layout & State-Based Navigation Shell
- [x] Create `src/pages/PracticePage.jsx` placeholder component.
- [x] Create `src/pages/ProgressPage.jsx` placeholder component.
- [x] Implement `src/components/layout/Header.jsx` with app title, navigation tabs (Practice / Progress), theme toggle button, and local guest status.
- [x] Implement `src/components/layout/AppShell.jsx` wrapping layout around views.
- [x] Update `src/App.jsx` to coordinate the theme hook and state-based page switching (`practice` vs `progress`).

## Phase 1.3 Verification & Documentation
- [x] Run `npm run build` to verify clean compilation (Vite build passed, PWA assets generated).
- [x] User manual verification of theme toggle, persistence, navigation tabs, and responsive layout.
- [x] Update architecture documentation in `docs/architecture/01_platform_and_pwa.md`.
- [x] Finalize phase completion and git commit message.
