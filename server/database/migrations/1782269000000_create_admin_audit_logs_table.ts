import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_audit_logs'

  /**
   * A record of who changed whose access, and when.
   *
   * Board rows already carry created_by and updated_by, so content edits are
   * attributable. Account-level actions were not recorded anywhere, which left
   * no way to answer "who removed this person" after the fact — the question
   * that matters most once more than one person can administer access.
   *
   * Actor and target are kept as ids with SET NULL, plus a copy of the email at
   * the time. Deleting an account is one of the things being logged, so the log
   * has to survive the account it refers to.
   */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.integer('actor_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('actor_email', 254).nullable()

      table.string('action', 40).notNullable()

      table.integer('target_user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('target_email', 254).nullable()

      /** Human-readable summary, written once so the list needs no assembly. */
      table.string('summary', 255).notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
