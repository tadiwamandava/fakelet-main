import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import env from '#start/env'

/**
 * Bootstraps a default admin account so the app can be signed into on a fresh
 * database. Idempotent: it only creates the account if that email doesn't exist
 * yet, so re-seeding never overwrites an existing password.
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment for a real deployment.
 */
export default class extends BaseSeeder {
  async run() {
    const email = env.get('ADMIN_EMAIL', 'admin@k20center.ou.edu')
    const password = env.get('ADMIN_PASSWORD', 'changeme123')

    const user = await User.firstOrCreate({ email }, { email, password, isAdmin: true })

    if (user.$isLocal) {
      // Just created — the password came from the fallback if env wasn't set.
      if (!env.get('ADMIN_PASSWORD')) {
        console.warn(
          `[seed] Created admin "${email}" with the default password "changeme123". ` +
            `Set ADMIN_PASSWORD (and ADMIN_EMAIL) and change it after first login.`
        )
      } else {
        console.log(`[seed] Created admin "${email}".`)
      }
    } else {
      console.log(`[seed] Admin "${email}" already exists — left unchanged.`)
    }
  }
}
