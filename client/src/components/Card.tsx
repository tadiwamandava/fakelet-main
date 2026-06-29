import { useState } from 'react'
import { Bookmark, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import CardEditor from './CardEditor'
import { resolveImageUrl } from '../utils/imageUrl'

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
}

// Payload for creating a card (from Group's "+ Add card")
export interface CardCreateInput {
  groupId: number
  title: string
  position: number
}

export interface CardMutations {
  createCard: UseMutationResult<CardData, Error, CardCreateInput>
  updateCard: UseMutationResult<CardData, Error, CardUpdateInput>
  deleteCard: UseMutationResult<void, Error, number>
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
}

// Pull the 11-char video id out of any YouTube URL shape
function getYouTubeId(url?: string | null): string | null {
  const match = url?.match(/(?:embed\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function Card({ card, bookmarked, onToggleBookmark, editMode = false, cardM, autoEdit = false, onAutoEditDone }: CardProps) {
  const ytId = getYouTubeId(card.youtubeUrl)
  const [editing, setEditing] = useState(autoEdit)

  return (
    <div id={`card-${card.id}`} className="bg-white border border-line rounded-lg overflow-hidden transition-shadow hover:shadow-sm">
      {/* Image (if the card has one) */}
      {card.imageUrl && (
        <img
          src={resolveImageUrl(card.imageUrl)}
          alt={card.title}
          className="w-full h-28 object-cover border-b border-line"
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
        {/* Edit / delete — only in edit mode */}
        {editMode && (
          <div className="flex justify-end gap-2 mb-1">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit card"
              className="text-muted hover:text-ink transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => window.confirm('Delete this card?') && cardM?.deleteCard.mutate(card.id)}
              aria-label="Delete card"
              className="text-muted hover:text-brand transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        <p className="font-semibold text-sm text-ink mb-1">{card.title}</p>

        {card.description && (
          <p className="text-xs text-muted leading-relaxed mb-2 line-clamp-3">
            {card.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          {card.linkUrl ? (
            <a
              href={card.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand font-medium"
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
            className={`p-1 -m-1 transition-colors ${bookmarked ? 'text-brand' : 'text-muted hover:text-ink'}`}
          >
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {cardM && (
        <CardEditor
          open={editing}
          onClose={() => { setEditing(false); onAutoEditDone?.() }}
          card={card}
          saving={cardM.updateCard.isPending}
          onSave={(data: CardUpdateInput) => {
            cardM.updateCard.mutate(data, { onSuccess: () => setEditing(false) })
          }}
          uploadImage={cardM.uploadImage}
        />
      )}
    </div>
  )
}