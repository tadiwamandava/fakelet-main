import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invitations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('key', 20).notNullable().unique()
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('used_at').nullable()
      table.integer('used_by').unsigned().references('id').inTable('users').onDelete('SET NULL').nullable()
      table.timestamp('created_at').defaultTo(this.now()).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
