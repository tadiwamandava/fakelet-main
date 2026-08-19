import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'card_attachments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('card_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('cards')
        .onDelete('CASCADE')

      // Public path the file is served from, e.g. /uploads/1699-syllabus.pdf
      table.string('file_url').notNullable()
      // Original name as uploaded, shown to the reader and used for downloads
      table.string('file_name').notNullable()
      table.string('mime_type').nullable()
      table.integer('size_bytes').nullable()
      table.integer('position').defaultTo(0)

      table
        .integer('created_by')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at').defaultTo(this.now())

      table.index(['card_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
