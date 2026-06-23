import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import Card from './Card'
import InlineForm from './ui/InlineForm'
import type { CardMutations } from './Card'
import type { GroupData, GroupMutations } from './Column'

interface GroupProps {
  group: GroupData
  bookmarks: number[]
  onToggleBookmark: (id: number) => void
  editMode: boolean
  cardM: CardMutations
  groupM: GroupMutations
}

export default function Group({ group, bookmarks, onToggleBookmark, editMode, cardM, groupM }: GroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [addingCard, setAddingCard] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

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
          {group.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              bookmarked={bookmarks.includes(card.id)}
              onToggleBookmark={onToggleBookmark}
              editMode={editMode}
              cardM={cardM}
            />
          ))}

          {group.cards.length === 0 && !editMode && (
            <p className="text-xs text-muted text-center py-3 border border-dashed border-line rounded">
              No cards
            </p>
          )}

          {editMode && (
            addingCard ? (
              <InlineForm
                placeholder="Card title…"
                loading={cardM.createCard.isPending}
                onSave={(title: string) =>
                  cardM.createCard.mutate(
                    { groupId: group.id, title, position: group.cards.length },
                    { onSuccess: () => setAddingCard(false) }
                  )
                }
                onCancel={() => setAddingCard(false)}
              />
            ) : (
              <button
                onClick={() => setAddingCard(true)}
                className="text-xs text-muted border border-dashed border-line rounded py-2 hover:text-brand hover:border-brand"
              >
                + Add card
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}