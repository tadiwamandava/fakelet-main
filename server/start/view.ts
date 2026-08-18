import edge from 'edge.js'
import vite from '@adonisjs/vite/services/main'
import { edgePluginVite } from '@adonisjs/vite/plugins/edge'
import { edgePluginInertia } from '@adonisjs/inertia/plugins/edge'

/**
 * Registers the Edge tags used by resources/views/inertia_layout.edge:
 * `@vite` (asset URLs + HMR) and `@inertia` / `@inertiaHead` (the app shell).
 */
edge.use(edgePluginVite(vite))
edge.use(edgePluginInertia())
