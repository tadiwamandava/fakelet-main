import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { randomBytes } from 'node:crypto'
import User from '#models/user'
import env from '#start/env'

/**
 * Bootstraps the first admin account so a fresh database can be signed into.
 *
 * Idempotent: the account is only created when that email is absent, so
 * re-seeding never overwrites an existing password. That also means
 * ADMIN_PASSWORD has no effect once the account exists — change the password
 * through the app, not by re-running this.
 */
export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL', 'admin@k20center.ou.edu')

    /**
     * Never fall back to a fixed password. A literal default in the source is
     * public knowledge, so seeding a deployment without ADMIN_PASSWORD set
     * would hand out an admin account with a known password. A random one is
     * printed instead, which is useless to anyone who cannot read this output.
     */
    const generated = !env.get('ADMIN_PASSWORD')
    const password = env.get('ADMIN_PASSWORD') ?? randomBytes(12).toString('base64url')

    const user = await User.firstOrCreate({ email }, { email, password, isAdmin: true })

    if (!user.$isLocal) {
      console.log(`[seed] Admin "${email}" already exists — left unchanged.`)
      return
    }

    if (generated) {
      console.warn(
        `\n[seed] Created admin "${email}" with a generated password:\n\n` +
          `    ${password}\n\n` +
          `  This is shown once and is not stored anywhere else. Sign in and change\n` +
          `  it, or set ADMIN_PASSWORD before seeding to choose your own.\n`
      )
    } else {
      console.log(`[seed] Created admin "${email}" using ADMIN_PASSWORD.`)
    }
  }
}
