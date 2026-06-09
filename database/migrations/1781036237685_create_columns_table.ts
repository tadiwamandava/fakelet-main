import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'columns'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('board_id').unsigned().references('id').inTable('boards').onDelete('CASCADE')
      table.string('title').notNullable()
      table.integer('position').defaultTo(0)
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
