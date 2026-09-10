import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { randomBytes } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import env from '#start/env'

/** Predictable password for local development only. */
const DEV_PASSWORD = 'itsjustatest'

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
    const configured = env.get('ADMIN_PASSWORD')

    /**
     * Outside development there is no fixed fallback: a literal password in the
     * source is public knowledge, so seeding a real deployment without
     * ADMIN_PASSWORD would hand out an admin account anyone could sign into.
     * A random one is printed instead, which is useless to anyone who cannot
     * read the output.
     */
    const password =
      configured ?? (app.inProduction ? randomBytes(12).toString('base64url') : DEV_PASSWORD)

    const user = await User.firstOrCreate(
      { email },
      { email, password, isAdmin: true, isMasterAdmin: true }
    )

    if (!user.$isLocal) {
      /**
       * The password is still never touched — but master access is, because a
       * deployment that has no master at all cannot grant admin to anyone, and
       * re-seeding is the documented way back from that.
       */
      if (!user.isMasterAdmin) {
        user.merge({ isAdmin: true, isMasterAdmin: true })
        await user.save()
        console.log(`[seed] Admin "${email}" already existed — promoted to master admin.`)
      } else {
        console.log(`[seed] Master admin "${email}" already exists — left unchanged.`)
      }
      return
    }

    if (configured) {
      console.log(`[seed] Created admin "${email}" using ADMIN_PASSWORD.`)
    } else if (app.inProduction) {
      console.warn(
        `\n[seed] Created admin "${email}" with a generated password:\n\n` +
          `    ${password}\n\n` +
          `  This is shown once and is not stored anywhere else. Sign in and change\n` +
          `  it, or set ADMIN_PASSWORD before seeding to choose your own.\n`
      )
    } else {
      console.log(`[seed] Created admin "${email}" with the dev password "${DEV_PASSWORD}".`)
    }
  }
}
