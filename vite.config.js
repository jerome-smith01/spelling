import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import devMockApi from './tools/devMockApi.js';

// https://vite.dev/config/
// `npm run dev:mock` (vite --mode mock) serves a fake logged-in API for layout checks
export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'mock' ? [devMockApi()] : []),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Never serve the SPA shell for API calls (they live outside the SW scope, but be explicit)
        navigateFallbackDenylist: [/^\/api\//]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Spelling Tutor',
        short_name: 'SpellingTutor',
        description: 'Practice 3rd-grade curriculum spelling words with syllable guidance',
        theme_color: '#00008B',
        background_color: '#ffffff',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        start_url: '/spelling/app/',
        scope: '/spelling/app/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/spelling/app/',
  // Lets the app be viewed through the Astro dev server (localhost:4321/spelling/app/)
  // while hot reload still connects straight to Vite.
  server: {
    hmr: { host: 'localhost', clientPort: 5173 },
    // Dev only: forward same-origin API/auth calls to the local Astro site
    // (`npm run dev` in jerome-portfolio, port 4321 — do NOT set ADAPTER=node,
    // that swaps out the Cloudflare adapter and drops the D1 binding, which is
    // why /api/auth/me would 500 with "Database binding not found").
    proxy: mode === 'mock' ? undefined : { '/api': 'http://localhost:4321' }
  }
}));
