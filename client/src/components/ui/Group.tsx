import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Card from '../Card'
import type { GroupData } from './types'

interface GroupProps {
  group: GroupData
  bookmarks: number[]
  onToggleBookmark: (id: number) => void
}

export default function Group({ group, bookmarks, onToggleBookmark }: GroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="mb-4">
      {/* Group title — click to collapse */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1 w-full text-left mb-2 pb-1 border-b border-line"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {group.title}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2">
          {group.cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              bookmarked={bookmarks.includes(card.id)}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
          {group.cards.length === 0 && (
            <p className="text-xs text-muted text-center py-3 border border-dashed border-line rounded">
              No cards
            </p>
          )}
        </div>
      )}
    </div>
  )
}