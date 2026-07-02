import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  async up() {
    // group_id is already nullable. Ungrouped cards will have group_id NULL and
    // column_id set instead, so a card no longer needs to live inside a group.
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('column_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('columns')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('column_id')
    })
  }
}
