import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { ColumnData } from '~/components/Column'
import { pauseLiveUpdates, resumeLiveUpdates } from '~/lib/realtime'
import {
  applyLayout,
  buildLayout,
  columnCards,
  containerTarget,
  findCardContainer,
  findGroupColumn,
  groupCards,
  moveCard,
  moveColumn,
  moveGroup,
  parseId,
  resolveCardContainer,
} from '~/lib/boardDnd'
import type { Layout } from '~/lib/boardDnd'

type ReorderMutations = {
  reorderCards: { mutate: (v: { groupId?: number; columnId?: number; ids: number[] }) => void }
  reorderColumns: { mutate: (v: { boardId: number; ids: number[] }) => void }
  reorderGroups: { mutate: (v: { columnId: number; ids: number[] }) => void }
}

/**
 * Drag-and-drop for a board: columns, groups within and between columns, and
 * cards within and between any container.
 *
 * The layout is held locally for the length of a drag so the board can show
 * where the item will land, then the affected containers are saved and the
 * local copy is dropped as soon as the server's version arrives. Only the
 * containers that actually changed are written, so dragging a card two places
 * up does not rewrite the whole board.
 */
export function useBoardDnd({
  boardId,
  columns,
  enabled,
  mutations,
}: {
  boardId: number
  columns: ColumnData[]
  enabled: boolean
  mutations: ReorderMutations
}) {
  const serverLayout = useMemo(() => buildLayout(columns), [columns])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [active, setActive] = useState<{ kind: string; id: number } | null>(null)
  const dragging = useRef(false)

  /**
   * Once fresh props arrive the optimistic copy has done its job — the server
   * is now the better answer. Held onto during a drag, since props can land
   * mid-gesture from another admin's edit.
   */
  useEffect(() => {
    if (!dragging.current) setLayout(null)
  }, [serverLayout])

  const view = useMemo(() => (layout ? applyLayout(columns, layout) : columns), [columns, layout])

  const sensors = useSensors(
    /**
     * A few pixels of travel before a drag begins, so a tap on the handle still
     * registers as a click rather than a one-pixel drag.
     */
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  /**
   * Only ever collide with things the dragged item can actually be dropped on.
   *
   * The board nests droppables inside each other — a card list sits inside a
   * group, which sits inside a column — so an unfiltered search happily reports
   * that a column being dragged is "over" some card list several levels down.
   * With a pointer that mostly resolves itself; with the keyboard, which has no
   * pointer and falls back to rectangle overlap, it does not, and the drop
   * silently goes nowhere.
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const source = parseId(args.active.id as string)

    const accepts = (raw: string) => {
      const target = parseId(raw)
      if (!target) return false
      if (source?.kind === 'column') return target.kind === 'column'
      if (source?.kind === 'group') return target.kind === 'group' || target.kind === 'column'
      if (source?.kind === 'card') {
        return (
          target.kind === 'card' ||
          target.kind === 'cards-in-group' ||
          target.kind === 'cards-in-column'
        )
      }
      return false
    }

    const scoped = {
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => accepts(String(c.id))),
    }

    /**
     * With a pointer, the precise check comes first: containers do not sit
     * under the cursor the way items do, so overlap is the fallback.
     *
     * The keyboard has no pointer, and overlap serves it badly — the drag
     * overlay is a small chip rather than a full-size column, so after one
     * arrow press it can still overlap where it started and the item appears
     * not to move until the second press. Nearest centre flips cleanly at the
     * halfway point, which is the behaviour a keyboard user expects.
     */
    if (!args.pointerCoordinates) return closestCenter(scoped)

    const pointer = pointerWithin(scoped)
    if (pointer.length) return pointer
    const intersections = rectIntersection(scoped)
    return intersections.length ? intersections : closestCenter(scoped)
  }, [])

  const onDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseId(event.active.id as string)
    if (!parsed) return
    dragging.current = true
    // A live refresh mid-drag would move the board under the pointer.
    pauseLiveUpdates()
    setActive(parsed)
  }, [])

  /**
   * Cross-container preview.
   *
   * Cards and groups can be dropped somewhere they do not currently live, and
   * without moving them as the pointer crosses the boundary the destination
   * never opens a gap — there would be nothing showing where the item is about
   * to go. Reordering inside one container is left to dnd-kit's own animation
   * and only committed on drop.
   */
  const onDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active: from, over } = event
      if (!over) return
      const source = parseId(from.id as string)
      const target = String(over.id)
      if (!source) return

      setLayout((existing) => {
        const base = existing ?? serverLayout

        if (source.kind === 'card') {
          const container = resolveCardContainer(base, target)
          if (!container) return existing
          const origin = findCardContainer(base, source.id)
          if (!origin || origin === container) return existing

          const overCard = parseId(target)
          const destination = base.cardsByContainer[container] ?? []
          const index =
            overCard?.kind === 'card' ? destination.indexOf(overCard.id) : destination.length
          return moveCard(base, source.id, container, index < 0 ? destination.length : index)
        }

        if (source.kind === 'group') {
          const overParsed = parseId(target)
          const toColumn =
            overParsed?.kind === 'column'
              ? overParsed.id
              : overParsed?.kind === 'group'
                ? findGroupColumn(base, overParsed.id)
                : null
          if (!toColumn) return existing
          const fromColumn = findGroupColumn(base, source.id)
          if (fromColumn === toColumn) return existing

          const destination = base.groupsByColumn[toColumn] ?? []
          const index =
            overParsed?.kind === 'group' ? destination.indexOf(overParsed.id) : destination.length
          return moveGroup(base, source.id, toColumn, index < 0 ? destination.length : index)
        }

        return existing
      })
    },
    [serverLayout]
  )

  const finish = useCallback(() => {
    dragging.current = false
    setActive(null)
    resumeLiveUpdates()
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active: from, over } = event
      const source = parseId(from.id as string)
      if (!source || !over) return finish()

      const base = layout ?? serverLayout
      const target = String(over.id)

      if (source.kind === 'column') {
        const overParsed = parseId(target)
        const toIndex = overParsed?.kind === 'column' ? base.columnIds.indexOf(overParsed.id) : -1
        if (toIndex < 0 || base.columnIds[toIndex] === source.id) return finish()

        const next = moveColumn(base, source.id, toIndex)
        setLayout(next)
        mutations.reorderColumns.mutate({ boardId, ids: next.columnIds })
        return finish()
      }

      if (source.kind === 'group') {
        const overParsed = parseId(target)
        const toColumn =
          overParsed?.kind === 'column'
            ? overParsed.id
            : overParsed?.kind === 'group'
              ? findGroupColumn(base, overParsed.id)
              : findGroupColumn(base, source.id)
        if (!toColumn) return finish()

        const destination = base.groupsByColumn[toColumn] ?? []
        const toIndex =
          overParsed?.kind === 'group' ? destination.indexOf(overParsed.id) : destination.length
        const next = moveGroup(
          base,
          source.id,
          toColumn,
          toIndex < 0 ? destination.length : toIndex
        )
        setLayout(next)

        // The source column also lost a group, so both lists are written.
        const fromColumn = findGroupColumn(serverLayout, source.id)
        mutations.reorderGroups.mutate({ columnId: toColumn, ids: next.groupsByColumn[toColumn] })
        if (fromColumn && fromColumn !== toColumn) {
          mutations.reorderGroups.mutate({
            columnId: fromColumn,
            ids: next.groupsByColumn[fromColumn] ?? [],
          })
        }
        return finish()
      }

      if (source.kind === 'card') {
        const container = resolveCardContainer(base, target) ?? findCardContainer(base, source.id)
        if (!container) return finish()

        const overParsed = parseId(target)
        const destination = base.cardsByContainer[container] ?? []
        const toIndex =
          overParsed?.kind === 'card' ? destination.indexOf(overParsed.id) : destination.length
        const next = moveCard(
          base,
          source.id,
          container,
          toIndex < 0 ? destination.length : toIndex
        )
        setLayout(next)

        const body = containerTarget(container)
        if (body) mutations.reorderCards.mutate({ ...body, ids: next.cardsByContainer[container] })

        /**
         * Leaving a container does not need that container rewritten — the card
         * is simply no longer listed there, and the gap in the numbering is
         * harmless because reads order by position and then id.
         */
        return finish()
      }

      return finish()
    },
    [boardId, finish, layout, mutations, serverLayout]
  )

  const onDragCancel = useCallback(() => {
    setLayout(null)
    finish()
  }, [finish])

  /** What is following the pointer, looked up in the rendered board. */
  const overlay = useMemo(() => {
    if (!active) return null
    const label =
      active.kind === 'column'
        ? view.find((c) => c.id === active.id)?.title
        : active.kind === 'group'
          ? view.flatMap((c) => c.groups).find((g) => g.id === active.id)?.title
          : view
              .flatMap((c) => [...(c.cards ?? []), ...c.groups.flatMap((g) => g.cards)])
              .find((c) => c.id === active.id)?.title
    if (!label) return null
    return { label, kind: active.kind }
  }, [active, view])

  /**
   * Spoken feedback for the keyboard sensor. dnd-kit's defaults describe
   * positions in a flat list, which says nothing useful on a board of nested
   * containers.
   */
  const announcements = useMemo(
    () => ({
      onDragStart: ({ active: a }: any) => `Picked up ${describe(a.id, view)}.`,
      onDragOver: ({ over: o }: any) => (o ? `Over ${describe(o.id, view)}.` : 'No drop target.'),
      onDragEnd: ({ over: o }: any) =>
        o ? `Dropped on ${describe(o.id, view)}.` : 'Dropped back in place.',
      onDragCancel: () => 'Cancelled; put back where it was.',
    }),
    [view]
  )

  return {
    columns: view,
    enabled,
    sensors,
    collisionDetection,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    announcements,
    overlay,
  }
}

function describe(raw: unknown, columns: ColumnData[]): string {
  const parsed = parseId(raw as string)
  if (!parsed) return 'the board'
  if (parsed.kind === 'column')
    return `column ${columns.find((c) => c.id === parsed.id)?.title ?? ''}`
  if (parsed.kind === 'group' || parsed.kind === 'cards-in-group') {
    const group = columns.flatMap((c) => c.groups).find((g) => g.id === parsed.id)
    return `group ${group?.title ?? ''}`
  }
  if (parsed.kind === 'cards-in-column') {
    return `the ungrouped cards of ${columns.find((c) => c.id === parsed.id)?.title ?? ''}`
  }
  const card = columns
    .flatMap((c) => [...(c.cards ?? []), ...c.groups.flatMap((g) => g.cards)])
    .find((c) => c.id === parsed.id)
  return card?.title ?? 'a card'
}

export { columnCards, groupCards }
