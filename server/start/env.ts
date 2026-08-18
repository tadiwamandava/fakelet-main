/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  // Allowed cross-origin frontend(s), comma-separated. Only needed when the app
  // is served from a different origin than the API; leave unset when both are
  // on the same domain.
  CORS_ORIGIN: Env.schema.string.optional(),

  // Base URL used to build signup links in invitation emails. Defaults to
  // APP_URL, which is correct when the app and API share a domain.
  FRONTEND_URL: Env.schema.string.optional(),

  // Seeded default admin account (used by database/seeders/main/user_seeder.ts)
  ADMIN_EMAIL: Env.schema.string.optional(),
  ADMIN_PASSWORD: Env.schema.string.optional(),

  // Rate limiter backing store (defaults to in-memory)
  LIMITER_STORE: Env.schema.enum.optional(['memory'] as const),

  // Absolute path for uploaded images. Defaults to <cwd>/public/uploads, which
  // the production build recreates on every deploy — point this at a mounted
  // persistent disk in production so uploads survive.
  UPLOADS_DIR: Env.schema.string.optional(),

  // SMTP. Omit SMTP_HOST in dev to print invitation links and reset codes to
  // the console instead of sending mail. SMTP_USERNAME/SMTP_PASSWORD are only
  // sent when set, so an internal relay that accepts unauthenticated mail works.
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  // Address mail is sent from. Defaults to no-reply@<APP_URL host>.
  SMTP_FROM: Env.schema.string.optional(),
})
