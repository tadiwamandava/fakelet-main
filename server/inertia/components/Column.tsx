import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import Group from './Group'
import Card from './Card'
import InlineForm from '~/components/ui/InlineForm'
import type { CardData, CardMutations, MoveTarget } from './Card'

export interface GroupData {
  id: number
  title: string
  position?: number
  cards: CardData[]
}

export interface ColumnData {
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

interface GroupCreateInput {
  columnId: number
  title: string
  position: number
}

export interface ColumnMutations {
  updateColumn: UseMutationResult<ColumnData, Error, ColumnUpdateInput>
  deleteColumn: UseMutationResult<void, Error, number>
}

export interface GroupMutations {
  createGroup: UseMutationResult<GroupData, Error, GroupCreateInput>
  // Inferred from the symmetric rename/delete UI — confirm shapes when you convert Group.tsx
  updateGroup: UseMutationResult<GroupData, Error, { id: number; title: string }>
  deleteGroup: UseMutationResult<void, Error, number>
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
}

export default function Column({
  column, bookmarks, onToggleBookmark,
  editMode, cardM, groupM, columnM, highlightId,
}: ColumnProps) {
  const [addingGroup, setAddingGroup] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newCardId, setNewCardId] = useState<number | null>(null)

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
      { columnId: column.id, title: 'New card', position: ungrouped.length },
      { onSuccess: (card) => setNewCardId(card.id) }
    )
  }

  function moveCard(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= ungrouped.length) return
    const ids = ungrouped.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    cardM.reorderCards.mutate(ids)
  }

  return (
    <div className="w-[280px] sm:w-72 shrink-0 bg-white border border-line rounded-xl flex flex-col max-h-full">
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
          <div className="flex flex-col gap-2 mb-4">
            {ungrouped.map((card, i) => (
              <Card
                key={card.id}
                card={card}
                bookmarked={bookmarks.includes(card.id)}
                onToggleBookmark={onToggleBookmark}
                editMode={editMode}
                cardM={cardM}
                autoEdit={card.id === newCardId}
                onAutoEditDone={() => setNewCardId(null)}
                onMoveUp={i > 0 ? () => moveCard(i, -1) : undefined}
                onMoveDown={i < ungrouped.length - 1 ? () => moveCard(i, 1) : undefined}
                moveTargets={moveTargets}
                currentMoveKey={`column-${column.id}`}
              />
            ))}

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
          />
        ))}

        {editMode && (
          addingGroup ? (
            <InlineForm
              placeholder="Group title…"
              loading={groupM.createGroup.isPending}
              onSave={(title: string) =>
                groupM.createGroup.mutate(
                  { columnId: column.id, title, position: column.groups.length },
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