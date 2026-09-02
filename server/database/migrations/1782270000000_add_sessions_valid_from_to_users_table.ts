import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  /**
   * The moment before which this account's sessions are no longer accepted.
   *
   * Sessions are stored in a cookie (SESSION_DRIVER=cookie), so there is no
   * server-side row to delete when someone needs signing out — the browser
   * holds the whole thing. Instead each session records when it began, and
   * anything issued before this mark is refused. Setting it to now ends every
   * outstanding session for that account at once.
   *
   * Null means "never invalidated", which is every account until a master uses
   * it, so existing sessions survive the migration.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('sessions_valid_from', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sessions_valid_from')
    })
  }
}
