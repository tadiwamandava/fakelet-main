import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  /**
   * A second admin tier that owns access control.
   *
   * Master implies admin, so `is_admin` keeps meaning exactly what it meant and
   * every existing check against it is untouched; only the handful of actions
   * that grant or revoke access consult this column.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_master_admin').notNullable().defaultTo(false)
    })

    /**
     * Establish the first master, or the new column locks access control for
     * everyone. The seeded account is chosen deliberately: promoting every
     * current admin would leave the change with no effect until someone
     * remembered to demote them by hand.
     *
     * Deployments whose first admin uses a different address get their master
     * from the seeder, which promotes the ADMIN_EMAIL account on the next run.
     */
    this.defer(async (db) => {
      const seeded = await db
        .from('users')
        .where('is_admin', true)
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc')
        .select('id')
        .first()

      if (seeded) await db.from('users').where('id', seeded.id).update({ is_master_admin: true })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_master_admin')
    })
  }
}
