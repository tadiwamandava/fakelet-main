import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import Card from './Card'
import InlineForm from '~/components/ui/InlineForm'
import type { CardMutations, MoveTarget } from './Card'
import type { GroupData, GroupMutations } from './Column'

interface GroupProps {
  group: GroupData
  bookmarks: number[]
  onToggleBookmark: (id: number) => void
  editMode: boolean
  cardM: CardMutations
  groupM: GroupMutations
  moveTargets?: MoveTarget[]
  highlightId?: number | null
}

export default function Group({ group, bookmarks, onToggleBookmark, editMode, cardM, groupM, moveTargets, highlightId }: GroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newCardId, setNewCardId] = useState<number | null>(null)

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

  function moveCard(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= group.cards.length) return
    const ids = group.cards.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    cardM.reorderCards.mutate(ids)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 mb-2 pb-1 border-b border-line">
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
        <div className="flex flex-col gap-2">
          {group.cards.map((card, i) => (
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
              onMoveDown={i < group.cards.length - 1 ? () => moveCard(i, 1) : undefined}
              moveTargets={moveTargets}
              currentMoveKey={`group-${group.id}`}
            />
          ))}

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