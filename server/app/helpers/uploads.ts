import { join } from 'node:path'
import env from '#start/env'

/**
 * Where uploaded images are written and served from.
 *
 * The default (<cwd>/public/uploads) is only safe in development: `node ace
 * build` recreates the build directory on every deploy, so anything written
 * there at runtime is lost. In production set UPLOADS_DIR to a mounted
 * persistent disk.
 */
export const UPLOADS_DIR = env.get('UPLOADS_DIR', join(process.cwd(), 'public', 'uploads'))
