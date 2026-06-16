import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('group_id').unsigned().references('id').inTable('groups').onDelete('CASCADE')
      table.string('title').notNullable()
      table.text('description').nullable()
      table.string('image_url').nullable()
      table.string('link_url').nullable()
      table.string('link_title').nullable()
      table.string('youtube_url').nullable()
      table.integer('position').defaultTo(0)
      table.boolean('is_archived').defaultTo(false)
      table.boolean('is_deleted').defaultTo(false)
      table
        .integer('created_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .integer('updated_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.integer('version').defaultTo(1)
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
