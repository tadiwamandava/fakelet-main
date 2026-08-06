import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Auto-update the cached app on new deploys so users never get stuck on a
      // stale version (activates on next load).
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'K20 Hive',
        short_name: 'Hive',
        description: "K20's Hub for Integrated Visual Education",
        id: '/',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f7f7',
        theme_color: '#910D28',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built app shell; the cross-origin API is always fetched live.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    proxy: {
      '/uploads': 'http://localhost:3333',
    },
  },
})
