# Spelling Tutor — Phase 1 Action Plan
> Reference: `C:\Users\Jerom\My Apps\ai_skills\01.creating_new_features.md`
> Skill: `creating-new-features` | Repo: `jerome-smith01/spelling-tutor`

## Overall Status

| Phase | Title | Status | Model | Depends On |
|-------|-------|--------|-------|------------|
| 1 | Standalone React App (Vite + PWA shell) | ✅ Complete | Gemini 3.8 Flash (Medium) | Phase 0 |

---

## Resolved Architectural Decisions

- **Design Tokens:** `src/styles/design-tokens.css` mirrors the Good Plus Fast `theme.css` tokens (`--background`, `--foreground`, `--muted`, `--muted-foreground`, etc.).
- **Typography:** Uses default system font stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). External fonts (Comic Neue) postponed to a later phase.
- **Routing:** Postpone `react-router-dom`. Use clean state-based view management (`activePage: 'practice' | 'progress'`) in `App.jsx` for lightweight prototype focus.
- **Authentication:** Postpone remote GPF cookie authorization to Phase 4. Phase 1 runs completely standalone with `localStorage` persistence and guest/local mode.

---

## Implementation Phases

### 1.1 Foundation & Design System
**Action:** Establish the global CSS design tokens, standard system typography, and theme toggle hook.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/styles/design-tokens.css` | Mirror GPF variables (`--background`, `--foreground`, `--muted`, etc.) from Astro `theme.css` |
| NEW | `src/styles/global.css` | Import tokens, set default system font, reset, transitions, button touch feedback |
| NEW | `src/hooks/useTheme.js` | Dark/light toggle with `localStorage` persistence and `.dark` class management on `document.documentElement` |

**Key Pattern (Theme Hook):**
```js
import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  return { theme, toggleTheme };
}
```

**Recommended Model:** `Gemini 3.8 Flash (Low)`
*Reason: Mechanical file creation of standard CSS tokens and boilerplate React hook.*

---

### 1.2 Layout & State-Based Navigation Shell
**Action:** Build the shared layout (Header, navigation tabs, theme toggle) and hook up lightweight state-based page switching without external router dependencies.

| Action | File | Notes |
|--------|------|-------|
| NEW | `src/components/layout/Header.jsx` | App title, navigation tabs (Practice / Progress), theme toggle button, guest/local status badge |
| NEW | `src/components/layout/AppShell.jsx` | Responsive container wrapping Header and active page |
| NEW | `src/pages/PracticePage.jsx` | Placeholder view for Phase 2 spelling card UI |
| NEW | `src/pages/ProgressPage.jsx` | Placeholder view for Phase 4 progress dashboard |
| MODIFY | `src/App.jsx` | Coordinate theme hook and state-based page switching (`practice` vs `progress`) inside `AppShell` |

**Key Pattern (State-Based Navigation Shell):**
```jsx
// src/App.jsx
import React, { useState } from 'react';
import AppShell from './components/layout/AppShell';
import PracticePage from './pages/PracticePage';
import ProgressPage from './pages/ProgressPage';
import { useTheme } from './hooks/useTheme';
import './styles/global.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState('practice');

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {activePage === 'practice' && <PracticePage />}
      {activePage === 'progress' && <ProgressPage />}
    </AppShell>
  );
}
```

**Recommended Model:** `Gemini 3.8 Flash (Medium)`
*Reason: Multi-component layout construction, clean prop wiring, and accessibility attributes for interactive controls.*

---

## Accessibility Best Practices
- **Theme Toggle:** Provided with descriptive `aria-label="Toggle dark mode"` and `aria-pressed`.
- **Navigation Controls:** Uses semantic `<nav>` with `aria-current="page"` on the active tab.
- **Color Contrast:** All token pairings (`--foreground` on `--background`, `--muted-foreground` on `--muted`) meet WCAG 2.1 AA standards (minimum 4.5:1 ratio) in both light and dark themes.

---

## Manual Verification Checklist

- [ ] Run `npm run dev` and navigate to `http://localhost:5173/spelling/app/`.
- [ ] Verify default font renders cleanly with system fonts (no missing web font flashes).
- [ ] Click the Theme Toggle:
  - App toggles between Light and Dark mode instantly.
  - Refresh the browser: theme preference persists from `localStorage`.
- [ ] Navigation:
  - Clicking "Practice" renders the Practice Page placeholder.
  - Clicking "Progress" renders the Progress Page placeholder.
  - Active tab is visually highlighted with clear contrast and `aria-current="page"`.
- [ ] PWA Verification:
  - Chrome / Edge DevTools > Application > Manifest shows manifest loaded with base `/spelling/app/`.
- [ ] Build Check:
  - Run `npm run build` to confirm zero lint or Vite bundling errors.

---

## Architecture Doc Updates
- [ ] Document the local-first prototype architecture and state-based navigation in `spelling_tutor/docs/architecture/01_platform_and_pwa.md`.
