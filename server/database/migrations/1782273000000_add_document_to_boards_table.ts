import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'boards'

  /**
   * A long-form document per board — lesson notes, planning, anything several
   * admins work on together.
   *
   * Held as sanitised HTML, like card descriptions. Separate from
   * `description`, which is the short blurb shown in the sidebar and on the
   * board list, and which stays a single line of plain prose.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('document').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('document')
    })
  }
}
