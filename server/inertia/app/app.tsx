import '../css/app.css'

import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import Tooltips from '~/components/ui/Tooltips'

const APP_NAME = 'K20 Hive'

createInertiaApp({
  /**
   * Reproduces the old useTitle hook: pages set a bare title via <Head> and it
   * is suffixed here, so the tab always reads "<page> — K20 Hive".
   */
  title: (title) => (title ? `${title} — ${APP_NAME}` : APP_NAME),

  /**
   * Replaces the per-page loading spinners the SPA used to render.
   */
  progress: { color: '#910D28' },

  resolve: (name) => {
    return resolvePageComponent(
      `../pages/${name}.tsx`,
      import.meta.glob('../pages/**/*.tsx')
    )
  },

  setup({ el, App, props }) {
    createRoot(el).render(
      <>
        {/* Keyboard/screen-reader users can jump straight to the page content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-ink focus:border focus:border-brand focus:rounded-lg focus:px-4 focus:py-2 focus:shadow-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <App {...props} />

        {/*
          Mounted once here rather than per page, so the global tooltip portal
          never remounts across Inertia navigations.
        */}
        <Tooltips />
      </>
    )
  },
})
