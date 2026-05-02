import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' — pokazujemy użytkownikowi banner gdy nowa wersja jest gotowa.
      // Inaczej niż 'autoUpdate' nie wymusza odświeżenia w trakcie pracy
      // (zapobiega utracie danych formularza).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MoodFlow',
        short_name: 'MoodFlow',
        description: 'Platforma monitorowania dobrostanu psychicznego pracowników',
        theme_color: '#C06226',
        background_color: '#F5EEE3',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'pl',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Auth + dane użytkownika nie są cache'owane (wycieki po wylogowaniu).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/auth/') ||
              url.pathname.includes('/users/me') ||
              url.pathname.includes('/results') ||
              url.pathname.includes('/admin') ||
              url.pathname.includes('/analytics'),
            handler: 'NetworkOnly',
          },
          {
            // Pozostałe zapytania API — krótki cache, network-first
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || /\/v?\d?\/(assessments|departments|organizations)/.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
  },
})
