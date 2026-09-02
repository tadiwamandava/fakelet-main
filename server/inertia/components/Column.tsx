import { useState } from 'react'
import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { Mutation } from '~/lib/mutations'
import Group from './Group'
import Card from './Card'
import InlineForm from '~/components/ui/InlineForm'
import type { CardData, CardMutations, MoveTarget } from './Card'
import {
  acceptsDrag,
  cardId,
  columnCards,
  columnId as columnSortId,
  groupId as groupSortId,
  parseId,
} from '~/lib/boardDnd'

export type GroupData = {
  id: number
  title: string
  position?: number
  cards: CardData[]
}

export type ColumnData = {
  id: number
  title: string
  groups: GroupData[]
  // Ungrouped cards that live directly on the column
  cards: CardData[]
}

interface ColumnUpdateInput {
  id: number
  title: string
}

/** Positions are assigned by the server, so creates never send one. */
interface GroupCreateInput {
  columnId: number
  title: string
}

export interface ColumnMutations {
  updateColumn: Mutation<ColumnUpdateInput>
  deleteColumn: Mutation<number>
}

export interface GroupMutations {
  createGroup: Mutation<GroupCreateInput, { id: number }>
  // Inferred from the symmetric rename/delete UI — confirm shapes when you convert Group.tsx
  updateGroup: Mutation<{ id: number; title: string }>
  deleteGroup: Mutation<number>
}

interface ColumnProps {
  column: ColumnData
  bookmarks: number[]
  onToggleBookmark: (id: number) => void
  editMode: boolean
  cardM: CardMutations
  groupM: GroupMutations
  columnM: ColumnMutations
  highlightId?: number | null
  draggable?: boolean
}

export default function Column({
  column, bookmarks, onToggleBookmark,
  editMode, cardM, groupM, columnM, highlightId, draggable = false,
}: ColumnProps) {
  const [addingGroup, setAddingGroup] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newCardId, setNewCardId] = useState<number | null>(null)

  /**
   * Like a group, a column is both a sortable item on the board and a container
   * — here for its ungrouped cards — so it carries two ids.
   */
  const activeKind = parseId(useDndContext().active?.id as string)?.kind
  const sortable = useSortable({
    id: columnSortId(column.id),
    disabled: { draggable: !draggable, droppable: !acceptsDrag(activeKind, 'column') },
  })
  const dropzone = useDroppable({
    id: columnCards(column.id),
    disabled: !acceptsDrag(activeKind, 'cards-in-column'),
  })

  const ungrouped = column.cards ?? []

  // Destinations a card in this column can be moved to: ungrouped, or any group
  const moveTargets: MoveTarget[] = [
    { key: `column-${column.id}`, label: 'Ungrouped', groupId: null, columnId: column.id },
    ...column.groups.map((g) => ({
      key: `group-${g.id}`,
      label: g.title,
      groupId: g.id,
      columnId: null,
    })),
  ]

  function addCard() {
    cardM.createCard.mutate(
      { columnId: column.id, title: 'New card' },
      { onSuccess: (card) => setNewCardId(card.id) }
    )
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={[
        'w-[280px] sm:w-72 shrink-0 bg-white border border-line rounded-xl flex flex-col max-h-full',
        sortable.isDragging ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="px-4 py-3 border-b border-line shrink-0">
        {editingTitle ? (
          <InlineForm
            initialValue={column.title}
            placeholder="Column title…"
            loading={columnM.updateColumn.isPending}
            onSave={(title: string) =>
              columnM.updateColumn.mutate({ id: column.id, title }, { onSuccess: () => setEditingTitle(false) })
            }
            onCancel={() => setEditingTitle(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            {editMode && (
              <button
                ref={sortable.setActivatorNodeRef}
                {...sortable.attributes}
                {...sortable.listeners}
                disabled={!draggable}
                aria-label={`Reorder column ${column.title}`}
                title="Drag to reorder, or press space and use the arrow keys"
                className="text-muted hover:text-ink disabled:opacity-30 cursor-grab active:cursor-grabbing touch-none -ml-1 p-0.5"
              >
                <GripVertical size={14} />
              </button>
            )}
            <h2 className="font-serif font-semibold text-ink flex-1">{column.title}</h2>
            {editMode && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingTitle(true)}
                  aria-label="Rename column"
                  title="Rename column"
                  className="text-muted hover:text-ink transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete column "${column.title}" and everything in it?`)) {
                      columnM.deleteColumn.mutate(column.id)
                    }
                  }}
                  aria-label="Delete column"
                  title="Delete column"
                  className="text-muted hover:text-brand transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Ungrouped cards — no sub-group required */}
        {(ungrouped.length > 0 || editMode) && (
          <div
            ref={dropzone.setNodeRef}
            className={`flex flex-col gap-2 mb-4 rounded-lg transition-colors ${
              dropzone.isOver ? 'bg-brand/5 outline-2 outline-dashed outline-brand/30' : ''
            }`}
          >
            <SortableContext
              items={ungrouped.map((c) => cardId(c.id))}
              strategy={verticalListSortingStrategy}
            >
            {ungrouped.map((card) => (
              <Card
                key={card.id}
                card={card}
                bookmarked={bookmarks.includes(card.id)}
                onToggleBookmark={onToggleBookmark}
                editMode={editMode}
                cardM={cardM}
                autoEdit={card.id === newCardId}
                onAutoEditDone={() => setNewCardId(null)}
                moveTargets={moveTargets}
                currentMoveKey={`column-${column.id}`}
                draggable={draggable}
              />
            ))}
            </SortableContext>

            {editMode && (
              <button
                onClick={addCard}
                disabled={cardM.createCard.isPending}
                className="text-xs text-muted border border-dashed border-line rounded py-2 hover:text-brand hover:border-brand disabled:opacity-40"
              >
                {cardM.createCard.isPending ? 'Adding…' : '+ Add card'}
              </button>
            )}
          </div>
        )}

        <SortableContext
          items={column.groups.map((g) => groupSortId(g.id))}
          strategy={verticalListSortingStrategy}
        >
          {column.groups.map((group) => (
            <Group
              key={group.id}
              group={group}
              bookmarks={bookmarks}
              onToggleBookmark={onToggleBookmark}
              editMode={editMode}
              cardM={cardM}
              groupM={groupM}
              moveTargets={moveTargets}
              highlightId={highlightId}
              draggable={draggable}
            />
          ))}
        </SortableContext>

        {editMode && (
          addingGroup ? (
            <InlineForm
              placeholder="Group title…"
              loading={groupM.createGroup.isPending}
              onSave={(title: string) =>
                groupM.createGroup.mutate(
                  { columnId: column.id, title },
                  { onSuccess: () => setAddingGroup(false) }
                )
              }
              onCancel={() => setAddingGroup(false)}
            />
          ) : (
            <button
              onClick={() => setAddingGroup(true)}
              className="w-full text-xs text-muted border border-dashed border-line rounded py-2 hover:text-brand hover:border-brand transition-colors"
            >
              + Add group
            </button>
          )
        )}
      </div>
    </div>
  )
}