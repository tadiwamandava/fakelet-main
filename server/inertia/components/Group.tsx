import { useEffect, useState } from 'react'
import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Pencil, Trash2 } from 'lucide-react'
import Card from './Card'
import InlineForm from '~/components/ui/InlineForm'
import type { CardMutations, MoveTarget } from './Card'
import type { GroupData, GroupMutations } from './Column'
import { acceptsDrag, cardId, groupCards, groupId as groupSortId, parseId } from '~/lib/boardDnd'

interface GroupProps {
  group: GroupData
  bookmarks: number[]
  onToggleBookmark: (id: number) => void
  editMode: boolean
  cardM: CardMutations
  groupM: GroupMutations
  moveTargets?: MoveTarget[]
  highlightId?: number | null
  draggable?: boolean
}

export default function Group({ group, bookmarks, onToggleBookmark, editMode, cardM, groupM, moveTargets, highlightId, draggable = false }: GroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newCardId, setNewCardId] = useState<number | null>(null)

  /**
   * A group plays two parts in a drag: it is an item among its column's groups,
   * and a container cards can be dropped into. Those need separate ids, or
   * dropping a card onto a group would be indistinguishable from moving the
   * group itself.
   */
  const activeKind = parseId(useDndContext().active?.id as string)?.kind
  const sortable = useSortable({
    id: groupSortId(group.id),
    disabled: { draggable: !draggable, droppable: !acceptsDrag(activeKind, 'group') },
  })
  const dropzone = useDroppable({
    id: groupCards(group.id),
    disabled: !acceptsDrag(activeKind, 'cards-in-group'),
  })

  // Expand automatically when a bookmarked card in this group is being targeted
  useEffect(() => {
    if (highlightId != null && group.cards.some((c) => c.id === highlightId)) {
      setCollapsed(false)
    }
  }, [highlightId, group.cards])

  function addCard() {
    cardM.createCard.mutate(
      { groupId: group.id, title: 'New card' },
      { onSuccess: (card) => setNewCardId(card.id) }
    )
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={`mb-4 ${sortable.isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-1 mb-2 pb-1 border-b border-line">
        {editMode && (
          <button
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
            disabled={!draggable}
            aria-label={`Reorder group ${group.title}`}
            title="Drag to reorder, or press space and use the arrow keys"
            className="text-muted hover:text-ink disabled:opacity-30 cursor-grab active:cursor-grabbing touch-none -ml-1 p-0.5"
          >
            <GripVertical size={12} />
          </button>
        )}
        {editingTitle ? (
          <InlineForm
            initialValue={group.title}
            placeholder="Group title…"
            loading={groupM.updateGroup.isPending}
            onSave={(title: string) =>
              groupM.updateGroup.mutate({ id: group.id, title }, { onSuccess: () => setEditingTitle(false) })
            }
            onCancel={() => setEditingTitle(false)}
          />
        ) : (
          <>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center gap-1 flex-1 text-left"
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {group.title}
              </span>
            </button>
            {editMode && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingTitle(true)}
                  aria-label="Rename group"
                  title="Rename group"
                  className="text-muted hover:text-ink"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete group "${group.title}" and its cards?`)) {
                      groupM.deleteGroup.mutate(group.id)
                    }
                  }}
                  aria-label="Delete group"
                  title="Delete group"
                  className="text-muted hover:text-brand"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!collapsed && (
        <div
          ref={dropzone.setNodeRef}
          className={`flex flex-col gap-2 rounded-lg transition-colors ${
            dropzone.isOver ? 'bg-brand/5 outline-2 outline-dashed outline-brand/30' : ''
          }`}
        >
          <SortableContext
            items={group.cards.map((c) => cardId(c.id))}
            strategy={verticalListSortingStrategy}
          >
          {group.cards.map((card) => (
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
              currentMoveKey={`group-${group.id}`}
              draggable={draggable}
            />
          ))}
          </SortableContext>

          {group.cards.length === 0 && !editMode && (
            <p className="text-xs text-muted text-center py-3 border border-dashed border-line rounded">
              No cards
            </p>
          )}

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
    </div>
  )
}