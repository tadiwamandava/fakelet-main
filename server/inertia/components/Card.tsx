import { useRef, useState } from 'react'
import { Bookmark, ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import CardEditor from './CardEditor'
import { resolveImageUrl } from '~/utils/imageUrl'

export interface CardData {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  youtubeUrl?: string | null
  linkUrl?: string | null
  linkTitle?: string | null
}

// Payload CardEditor sends back on save
export interface CardUpdateInput extends Partial<Omit<CardData, 'id'>> {
  id: number
  groupId?: number | null
  columnId?: number | null
}

// A place a card can be moved to: either a group or the column itself (ungrouped)
export interface MoveTarget {
  key: string
  label: string
  groupId: number | null
  columnId: number | null
}

// Payload for creating a card — either inside a group ("+ Add card" in a group)
// or directly on a column ("+ Add card" at column level, no group required)
export interface CardCreateInput {
  groupId?: number
  columnId?: number
  title: string
  position: number
}

export interface CardMutations {
  createCard: UseMutationResult<CardData, Error, CardCreateInput>
  updateCard: UseMutationResult<CardData, Error, CardUpdateInput>
  deleteCard: UseMutationResult<void, Error, number>
  reorderCards: UseMutationResult<void, Error, number[]>
  uploadImage: UseMutationResult<{ imageUrl: string }, Error, { cardId: number; file: File }>
}

interface CardProps {
  card: CardData
  bookmarked: boolean
  onToggleBookmark: (id: number) => void
  editMode?: boolean
  cardM?: CardMutations
  autoEdit?: boolean
  onAutoEditDone?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  moveTargets?: MoveTarget[]
  currentMoveKey?: string
}

// Only allow safe link schemes — blocks javascript:/data: URL injection
function safeHref(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url, window.location.origin)
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? url : undefined
  } catch {
    return undefined
  }
}

// Pull the 11-char video id out of any YouTube URL shape
function getYouTubeId(url?: string | null): string | null {
  const match = url?.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function Card({ card, bookmarked, onToggleBookmark, editMode = false, cardM, autoEdit = false, onAutoEditDone, onMoveUp, onMoveDown, moveTargets, currentMoveKey }: CardProps) {
  const ytId = getYouTubeId(card.youtubeUrl)
  const [editing, setEditing] = useState(autoEdit)
  const [descExpanded, setDescExpanded] = useState(false)
  // Track whether a freshly-added card was ever saved, so cancelling it discards it
  const savedRef = useRef(false)

  function handleClose() {
    setEditing(false)
    // A just-added card dismissed without saving is abandoned — remove it
    // rather than leaving a blank "New card" behind.
    if (autoEdit && !savedRef.current) {
      cardM?.deleteCard.mutate(card.id)
    }
    onAutoEditDone?.()
  }

  return (
    <div id={`card-${card.id}`} className="bg-white border border-line rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
      {/* Image (if the card has one) */}
      {card.imageUrl && (
        <img
          src={resolveImageUrl(card.imageUrl)}
          alt={card.title}
          loading="lazy"
          decoding="async"
          className="w-full h-auto border-b border-line"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}

      {/* YouTube embed (only if no image) */}
      {ytId && !card.imageUrl && (
        <div className="relative pt-[56.25%] bg-black border-b border-line">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title={card.title}
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      <div className="p-3">
        {/* Reorder / edit / delete — only in edit mode */}
        {editMode && (
          <div className="flex items-center justify-between mb-1">
            <div className="flex gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                aria-label="Move card up"
                title="Move card up"
                className="text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronUp size={15} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                aria-label="Move card down"
                title="Move card down"
                className="text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronDown size={15} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                aria-label="Edit card"
                title="Edit card"
                className="text-muted hover:text-ink transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => window.confirm('Delete this card?') && cardM?.deleteCard.mutate(card.id)}
                aria-label="Delete card"
                title="Delete card"
                className="text-muted hover:text-brand transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}

        <p className="font-semibold text-sm text-ink mb-1">{card.title}</p>

        {card.description && (
          <div className="mb-2">
            <p className={`text-xs text-muted leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
              {card.description}
            </p>
            {card.description.length > 120 && (
              <button
                onClick={(e) => { e.stopPropagation(); setDescExpanded((x) => !x) }}
                className="text-xs text-brand font-medium hover:underline mt-0.5"
              >
                {descExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {safeHref(card.linkUrl) ? (
            <a
              href={safeHref(card.linkUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue font-medium"
            >
              <ExternalLink size={12} />
              {card.linkTitle || 'Link'}
            </a>
          ) : (
            <span />
          )}

          <button
            onClick={() => onToggleBookmark(card.id)}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this card'}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this card'}
            className={`p-1 -m-1 transition-colors ${bookmarked ? 'text-brand' : 'text-muted hover:text-ink'}`}
          >
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {cardM && (
        <CardEditor
          open={editing}
          onClose={handleClose}
          card={card}
          saving={cardM.updateCard.isPending}
          onSave={(data: CardUpdateInput) => {
            cardM.updateCard.mutate(data, {
              onSuccess: () => { savedRef.current = true; setEditing(false) },
            })
          }}
          uploadImage={cardM.uploadImage}
          moveTargets={moveTargets}
          currentMoveKey={currentMoveKey}
        />
      )}
    </div>
  )
}