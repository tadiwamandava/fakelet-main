import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cards'

  /**
   * Which board an archived card came from.
   *
   * A card reaches its board only through its group or column, and deleting a
   * column detaches its cards — setting both to null — so the foreign-key
   * cascade cannot destroy them. Those rows survive but lose every trace of
   * where they belonged, which is why nothing has ever been able to offer them
   * back. Recording the board at the moment of archiving is what makes a
   * per-board recycle bin possible.
   *
   * Null on a live card; only meaningful once is_deleted is true.
   */
  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('archived_board_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('boards')
        .onDelete('CASCADE')
    })

    /**
     * Backfill what can still be worked out. Cards archived by an ordinary
     * delete kept their parent, so their board is derivable; cards orphaned by
     * an earlier column delete have nothing left to derive from and stay null.
     * Those are surfaced as unrecoverable rather than quietly dropped.
     */
    this.defer(async (db) => {
      await db.rawQuery(`
        update cards c
        set archived_board_id = cols.board_id
        from columns cols
        left join groups g on g.column_id = cols.id
        where c.is_deleted = true
          and c.archived_board_id is null
          and (c.column_id = cols.id or c.group_id = g.id)
      `)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('archived_board_id')
    })
  }
}
