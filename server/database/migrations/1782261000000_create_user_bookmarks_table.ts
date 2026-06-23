import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_bookmarks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.integer('card_id').unsigned().notNullable().references('id').inTable('cards').onDelete('CASCADE')
      table.timestamp('created_at').defaultTo(this.now())
      table.unique(['user_id', 'card_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
