import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'collab_documents'

  /**
   * The Yjs state behind every collaboratively edited field.
   *
   * Yjs merges concurrent edits by keeping its own CRDT structure, which is not
   * derivable from the rendered HTML — two people typing at once are reconciled
   * from this, not from the text. So it is stored alongside the readable
   * content rather than instead of it: this table is the editing state, while
   * `cards.description` and `boards.document` keep the HTML that the board,
   * the token API and search actually read.
   *
   * `name` is the room key, `card:<id>` or `board:<id>`, matching what the
   * client asks the socket for.
   */
  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 100).notNullable().unique()

      /** The encoded Y.Doc update. Binary, not text — it is not UTF-8. */
      table.binary('state').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
