import type { ColumnData } from '~/components/Column'

/**
 * The board's arrangement, flattened into the id lists drag-and-drop works on.
 *
 * Dragging needs to answer two questions constantly — what order is this
 * container in, and which container is this item in — and walking the nested
 * board props for both on every pointer move is awkward. This is that shape,
 * derived once per render and updated locally while a drag is in flight so the
 * board can show where the item will land before anything is saved.
 */
export type Layout = {
  /** Board columns, left to right. */
  columnIds: number[]
  /** Group ids per column, top to bottom. */
  groupsByColumn: Record<number, number[]>
  /** Card ids per container, keyed by container id. */
  cardsByContainer: Record<string, number[]>
}

/**
 * Ids handed to dnd-kit.
 *
 * Sortable items and drop containers live in one id space, and a group is both
 * — an item among its column's groups, and a container for its cards. They
 * therefore get separate prefixes, or dropping a card on a group would be
 * indistinguishable from reordering that group.
 */
export const cardId = (id: number) => `card:${id}`
export const groupId = (id: number) => `group:${id}`
export const columnId = (id: number) => `column:${id}`

/** Card containers: a group, or a column's ungrouped area. */
export const groupCards = (id: number) => `cards-in-group:${id}`
export const columnCards = (id: number) => `cards-in-column:${id}`

export type Parsed = { kind: string; id: number }

export function parseId(raw: string | number | null | undefined): Parsed | null {
  if (typeof raw !== 'string') return null
  const [kind, value] = raw.split(':')
  const id = Number(value)
  return Number.isInteger(id) ? { kind, id } : null
}

/** The container a card sits in, as the request body the server expects. */
export function containerTarget(container: string): { groupId?: number; columnId?: number } | null {
  const parsed = parseId(container)
  if (parsed?.kind === 'cards-in-group') return { groupId: parsed.id }
  if (parsed?.kind === 'cards-in-column') return { columnId: parsed.id }
  return null
}

export function buildLayout(columns: ColumnData[]): Layout {
  const layout: Layout = { columnIds: [], groupsByColumn: {}, cardsByContainer: {} }

  for (const column of columns) {
    layout.columnIds.push(column.id)
    layout.groupsByColumn[column.id] = column.groups.map((g) => g.id)
    layout.cardsByContainer[columnCards(column.id)] = (column.cards ?? []).map((c) => c.id)
    for (const group of column.groups) {
      layout.cardsByContainer[groupCards(group.id)] = group.cards.map((c) => c.id)
    }
  }

  return layout
}

/** Which card container currently holds this card. */
export function findCardContainer(layout: Layout, card: number): string | null {
  for (const [container, ids] of Object.entries(layout.cardsByContainer)) {
    if (ids.includes(card)) return container
  }
  return null
}

/**
 * Resolves what a card is hovering over into the container it would join.
 *
 * `over` is whatever dnd-kit reports under the pointer, which is either another
 * card or the container itself when hovering its empty space — both have to map
 * to the same answer.
 */
export function resolveCardContainer(layout: Layout, over: string): string | null {
  if (layout.cardsByContainer[over]) return over
  const parsed = parseId(over)
  if (parsed?.kind === 'card') return findCardContainer(layout, parsed.id)
  // An empty container still needs to accept a drop.
  if (parsed?.kind === 'cards-in-group' || parsed?.kind === 'cards-in-column') return over
  return null
}

function reinsert(ids: number[], id: number, index: number) {
  const without = ids.filter((x) => x !== id)
  const at = index < 0 || index > without.length ? without.length : index
  return [...without.slice(0, at), id, ...without.slice(at)]
}

/**
 * Moves a card to a position in a container, returning a new layout.
 *
 * Used both while dragging across containers (so the gap opens up under the
 * pointer) and on drop. Removing the card from wherever it was first means a
 * move within the same container works through the same path.
 */
export function moveCard(
  layout: Layout,
  card: number,
  toContainer: string,
  toIndex: number
): Layout {
  const cardsByContainer: Record<string, number[]> = {}
  for (const [container, ids] of Object.entries(layout.cardsByContainer)) {
    cardsByContainer[container] = ids.filter((id) => id !== card)
  }
  const destination = cardsByContainer[toContainer] ?? []
  cardsByContainer[toContainer] = reinsert(destination, card, toIndex)

  return { ...layout, cardsByContainer }
}

/** Moves a group within, or into, a column. */
export function moveGroup(
  layout: Layout,
  group: number,
  toColumn: number,
  toIndex: number
): Layout {
  const groupsByColumn: Record<number, number[]> = {}
  for (const [column, ids] of Object.entries(layout.groupsByColumn)) {
    groupsByColumn[Number(column)] = ids.filter((id) => id !== group)
  }
  groupsByColumn[toColumn] = reinsert(groupsByColumn[toColumn] ?? [], group, toIndex)

  return { ...layout, groupsByColumn }
}

export function moveColumn(layout: Layout, column: number, toIndex: number): Layout {
  return { ...layout, columnIds: reinsert(layout.columnIds, column, toIndex) }
}

/** The column a group currently belongs to. */
export function findGroupColumn(layout: Layout, group: number): number | null {
  for (const [column, ids] of Object.entries(layout.groupsByColumn)) {
    if (ids.includes(group)) return Number(column)
  }
  return null
}

/**
 * Rebuilds the nested board in the layout's order.
 *
 * Keeping the components rendering from ordinary board props — rather than
 * teaching each of them to read the flat layout — means only the drag wiring is
 * new; Column, Group and Card lay themselves out exactly as before. During a
 * drag this reflects the pending arrangement, so the board shows where the item
 * will land; the rest of the time it matches what the server sent.
 */
export function applyLayout(columns: ColumnData[], layout: Layout): ColumnData[] {
  const columnsById = new Map(columns.map((c) => [c.id, c]))
  const groupsById = new Map(columns.flatMap((c) => c.groups).map((g) => [g.id, g]))
  const cardsById = new Map(
    columns
      .flatMap((c) => [...(c.cards ?? []), ...c.groups.flatMap((g) => g.cards)])
      .map((c) => [c.id, c])
  )

  const cardsIn = (container: string) =>
    (layout.cardsByContainer[container] ?? [])
      .map((id) => cardsById.get(id))
      .filter((card): card is NonNullable<typeof card> => !!card)

  return layout.columnIds
    .map((id) => columnsById.get(id))
    .filter((column): column is ColumnData => !!column)
    .map((column) => ({
      ...column,
      cards: cardsIn(columnCards(column.id)),
      groups: (layout.groupsByColumn[column.id] ?? [])
        .map((gid) => groupsById.get(gid))
        .filter((group): group is NonNullable<typeof group> => !!group)
        .map((group) => ({ ...group, cards: cardsIn(groupCards(group.id)) })),
    }))
}

/**
 * Whether a drop target is meaningful for the item currently being dragged.
 *
 * The board nests droppables — a card list inside a group inside a column — so
 * several of them sit at almost the same place on screen. Leaving the
 * irrelevant ones enabled makes the keyboard sensor step onto a target that
 * looks identical to where it started, so the first arrow press appears to do
 * nothing. Each component switches its own drop target off using this.
 */
export function acceptsDrag(activeKind: string | undefined, targetKind: string): boolean {
  if (!activeKind) return false
  if (activeKind === 'column') return targetKind === 'column'
  if (activeKind === 'group') return targetKind === 'group' || targetKind === 'column'
  if (activeKind === 'card') {
    return targetKind === 'card' || targetKind === 'cards-in-group' || targetKind === 'cards-in-column'
  }
  return false
}
