import Board from '#models/board'

/**
 * Loads a single board with everything needed to render it: columns ordered by
 * position, each with its groups (and their cards) plus the ungrouped cards
 * that hang directly off the column. Soft-deleted cards are excluded.
 *
 * Every ordering falls back to `id`. Positions are assigned by the server now,
 * but boards edited before that could still hold ties, and Postgres is free to
 * return tied rows in any order — which reads as columns and cards swapping
 * places, or vanishing off the end of a scroller, between two loads of the
 * same board. The tiebreak makes the order stable regardless.
 *
 * Shared by the JSON API (GET /api/v1/boards/:id) and the Inertia board page so
 * both always return the same shape. Throws if the board does not exist.
 */
export function findBoardForDisplay(boardId: number | string) {
  return Board.query()
    .where('id', boardId)
    .preload('columns', (columnQuery) =>
      columnQuery
        .orderBy('position')
        .orderBy('id')
        .preload('groups', (groupQuery) =>
          groupQuery
            .orderBy('position')
            .orderBy('id')
            .preload('cards', (cardQuery) =>
              cardQuery
                .where('is_deleted', false)
                .orderBy('position')
                .orderBy('id')
                .preload('attachments', (a) => a.orderBy('position').orderBy('id'))
            )
        )
        .preload('cards', (cardQuery) =>
          cardQuery
            .where('is_deleted', false)
            .orderBy('position')
            .orderBy('id')
            .preload('attachments', (a) => a.orderBy('position').orderBy('id'))
        )
    )
    .firstOrFail()
}
