# Platform, Routing & PWA Architecture

## 1. Hosting & Reverse-Proxy Topology
Spelling Tutor is built as an independent SPA on Vite and deployed directly to Cloudflare Pages:
* Target: `spelling-tutor.pages.dev`
* Public Entry Point: `https://www.goodplusfast.com/spelling/app/`

### The Edge Proxy Worker
To provide seamless integration under the primary `goodplusfast.com` domain, an edge Cloudflare Worker (`spelling-proxy-worker.js`) intercepts all requests starting with `/spelling/app`:
1. Strips the `/spelling/app` prefix.
2. Rewrites the `Host` header to `spelling-tutor.pages.dev` to satisfy Cloudflare Pages SNI validation.
3. Forwards the request and pipes the response back.

### Base HREF Contract
Because of the path proxy, Vite must build with:
```js
base: '/spelling/app/'
```
This ensures all asset requests (e.g., `<script src="/spelling/app/assets/index.js">`) correctly hit the proxy worker and resolve upstream.

---

## 2. Progressive Web App (PWA)
PWA support is enabled via `vite-plugin-pwa`:
* **Manifest:** [`public/manifest.json`](../../public/manifest.json)
* **Scope & Start URL:** `/spelling/app/`
* **Service Worker:** Registered with `autoUpdate` to deliver instant updates upon CDN invalidation.

---

## 3. Landing Page & Proxy Layers (Phase 6)
* **Landing page:** `Astro Project/jerome-portfolio/src/pages/spelling/index.astro` at `goodplusfast.com/spelling/` (prerendered; uses the site `Layout`, theme tokens and `astro-icon`). Its "Open App" buttons link to `/spelling/app/`. Progress Tracking is live (Phase 4). The AI Coaching card stays marked "Coming soon" until Phase 5 ships.
* **Two proxy layers for `/spelling/app/*`** (same pattern as Pray the Bible):
  1. Edge Worker `spelling-proxy` (routes `goodplusfast.com/spelling/app*` and `www.`), the primary path in production.
  2. Astro SSR route `spelling/app/[...path].ts`, a fallback that behaves identically.
* **One-port local dev:** with `npm run dev` running in both projects, `http://localhost:4321/spelling/` is the landing page and `http://localhost:4321/spelling/app/` is the local Vite app (the Astro route forwards to `localhost:5173` when `import.meta.env.DEV`). `vite.config.js` sets `server.hmr.clientPort = 5173` so hot reload connects directly to Vite.
* **Public assets:** reference them as `/file` in `index.html` (Vite prepends the base); never write `/spelling/app/file` there or the base is doubled.

---

* Provides native Android packaging without requiring a rewrite in Flutter or React Native.

---

## 4. App Shell & Local-First Prototype Architecture (Phase 1)
* **Design System & Tokens:** Uses CSS variables in [`src/styles/design-tokens.css`](../../src/styles/design-tokens.css) mirroring Good Plus Fast's `theme.css` tokens (`--background`, `--foreground`, `--muted`, `--muted-foreground`).
* **Theme Management:** Managed by [`src/hooks/useTheme.js`](../../src/hooks/useTheme.js), reading system preference and storing preference in `localStorage` under `spelling_tutor_theme`.
* **Routing:** Since Phase 4 the app uses `react-router-dom` (`BrowserRouter` with `basename` from `BASE_URL`) so every screen and list has its own URL — see [`04_auth_and_sync.md`](./04_auth_and_sync.md#3-url-scheme-relative-to-spellingapp). Cloudflare Pages needs `public/_redirects` (`/* /index.html 200`) for deep links; the service worker denies `/api/*` navigation fallback.
* **Local-First Persistence:** Runs completely client-side in Phase 1 with guest/local profile support before connecting to the Cloudflare API in Phase 4.

