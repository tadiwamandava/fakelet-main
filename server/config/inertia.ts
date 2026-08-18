import { defineConfig } from '@adonisjs/inertia'

/**
 * Inertia settings.
 *
 * Note: unlike older versions, @adonisjs/inertia v5 has no `sharedData` config
 * key — props shared with every page are registered per request via
 * `ctx.inertia.share()`. See #middleware/inertia_share_middleware.
 */
const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  /**
   * SSR is intentionally disabled: the public board page does not need it, and
   * inertia/hooks/useBookmarks.ts reads localStorage at module scope, which
   * would throw during server rendering.
   */
  ssr: {
    enabled: false,
  },
})

export default inertiaConfig
