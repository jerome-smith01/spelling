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

* Provides native Android packaging without requiring a rewrite in Flutter or React Native.

---

## 4. App Shell & Local-First Prototype Architecture (Phase 1)
* **Design System & Tokens:** Uses CSS variables in [`src/styles/design-tokens.css`](../../src/styles/design-tokens.css) mirroring Good Plus Fast's `theme.css` tokens (`--background`, `--foreground`, `--muted`, `--muted-foreground`).
* **Theme Management:** Managed by [`src/hooks/useTheme.js`](../../src/hooks/useTheme.js), reading system preference and storing preference in `localStorage` under `spelling_tutor_theme`.
* **State-Based Navigation:** Uses a lightweight state-based view switcher (`activePage: 'practice' | 'progress'`) managed in `App.jsx`, avoiding extra routing overhead during the initial prototype phases.
* **Local-First Persistence:** Runs completely client-side in Phase 1 with guest/local profile support before connecting to the Cloudflare API in Phase 4.

