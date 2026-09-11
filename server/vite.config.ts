import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    adonisjs({
      entryPoints: ['inertia/app/app.tsx'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  /**
   * Mirrors the "~/*" subpath import in package.json so the same specifier
   * resolves in both tsc and Vite.
   */
  resolve: {
    alias: {
      '~/': `${fileURLToPath(new URL('./inertia', import.meta.url))}/`,
      // Code shared with the server, so the editor schema has one definition.
      '#shared/': `${fileURLToPath(new URL('./shared', import.meta.url))}/`,
    },
  },
})
