import { useEffect, useRef, useState } from 'react'
import { useDndContext } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bookmark, ExternalLink, GripVertical, Paperclip, Pencil, Trash2 } from 'lucide-react'
import type { Mutation } from '~/lib/mutations'
import CardEditor from './CardEditor'
import { acceptsDrag, cardId, parseId } from '~/lib/boardDnd'
import { resolveImageUrl } from '~/utils/imageUrl'

export type CardAttachment = {
  id: number
  fileUrl: string
  fileName: string
  sizeBytes?: number | null
}

export type CardData = {
  id: number
  /**
   * Bumped by the server on every save. The editor sends back the value it
   * opened with so a save that lands on top of someone else's is refused
   * instead of silently overwriting it.
   */
  version?: number | null
  title: string
  description?: string | null
  imageUrl?: string | null
  youtubeUrl?: string | null
  linkUrl?: string | null
  linkTitle?: string | null
  attachments?: CardAttachment[]
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
}

export interface CardMutations {
  // An Inertia write returns no body: creates flash back just the new id, and
  // updates/deletes deliver nothing. The page re-renders from fresh props.
  createCard: Mutation<CardCreateInput, { id: number }>
  updateCard: Mutation<CardUpdateInput>
  deleteCard: Mutation<number>
  uploadImage: Mutation<{ cardId: number; file: File }, { imageUrl: string }>
  uploadAttachment: Mutation<{ cardId: number; file: File }, { id: number }>
  deleteAttachment: Mutation<number>
}

interface CardProps {
  card: CardData
  bookmarked: boolean
  onToggleBookmark: (id: number) => void
  editMode?: boolean
  cardM?: CardMutations
  autoEdit?: boolean
  onAutoEditDone?: () => void
  moveTargets?: MoveTarget[]
  currentMoveKey?: string
  /** Whether this card can currently be picked up (edit mode, no active search). */
  draggable?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

export default function Card({ card, bookmarked, onToggleBookmark, editMode = false, cardM, autoEdit = false, onAutoEditDone, moveTargets, currentMoveKey, draggable = false }: CardProps) {
  const ytId = getYouTubeId(card.youtubeUrl)
  /**
   * Disabled outside edit mode, and while a search is filtering the board —
   * dropping into a filtered list would compute a position against cards that
   * are hidden rather than the real contents of the container.
   */
  const activeKind = parseId(useDndContext().active?.id as string)?.kind
  const sortable = useSortable({
    id: cardId(card.id),
    disabled: { draggable: !draggable, droppable: !acceptsDrag(activeKind, 'card') },
  })
  const [editing, setEditing] = useState(autoEdit)
  const [descExpanded, setDescExpanded] = useState(false)
  // Track whether a freshly-added card was ever saved, so cancelling it discards it
  const savedRef = useRef(false)
  const [conflict, setConflict] = useState<string | null>(null)

  /**
   * A card added from "+ Add card" asks to open its editor, but the flag only
   * arrives once the write comes back — after this component has mounted — so
   * the initial state above misses it and the card is left sitting there blank.
   */
  useEffect(() => {
    if (autoEdit) setEditing(true)
  }, [autoEdit])

  function handleClose() {
    setEditing(false)
    setConflict(null)
    // A just-added card dismissed without saving is abandoned — remove it
    // rather than leaving a blank "New card" behind.
    if (autoEdit && !savedRef.current) {
      cardM?.deleteCard.mutate(card.id)
    }
    onAutoEditDone?.()
  }

  return (
    <div
      id={`card-${card.id}`}
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={[
        'bg-white border border-line rounded-lg overflow-hidden transition-shadow hover:shadow-sm',
        // The original stays in place as a gap; the DragOverlay shows the card.
        sortable.isDragging ? 'opacity-40' : '',
      ].join(' ')}
    >
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
            {/*
              Dragging starts here and nowhere else, so a touch anywhere else on
              the card still scrolls the column. dnd-kit's keyboard sensor binds
              to the same handle: focus it, press space, then use the arrow keys.
            */}
            <button
              ref={sortable.setActivatorNodeRef}
              {...sortable.attributes}
              {...sortable.listeners}
              disabled={!draggable}
              aria-label={`Reorder ${card.title}`}
              title="Drag to reorder, or press space and use the arrow keys"
              className="text-muted hover:text-ink transition-colors disabled:opacity-30 cursor-grab active:cursor-grabbing touch-none -ml-1 p-1"
            >
              <GripVertical size={15} />
            </button>
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

        {card.attachments && card.attachments.length > 0 && (
          <ul className="mb-2 flex flex-col gap-1">
            {card.attachments.map((file) => (
              <li key={file.id}>
                <a
                  href={file.fileUrl}
                  download={file.fileName}
                  className="inline-flex items-center gap-1.5 text-xs text-blue font-medium hover:underline max-w-full"
                  title={`Download ${file.fileName}`}
                >
                  <Paperclip size={12} className="shrink-0" />
                  <span className="truncate">{file.fileName}</span>
                  {file.sizeBytes ? (
                    <span className="text-muted shrink-0">({formatBytes(file.sizeBytes)})</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
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
          conflict={conflict}
          onSave={(data: CardUpdateInput) => {
            setConflict(null)
            cardM.updateCard.mutate(data, {
              onSuccess: () => { savedRef.current = true; setEditing(false) },
              /**
               * Someone else saved this card first. The editor stays open with
               * everything still typed in it, and the card prop underneath has
               * already been refreshed to their version — so saving again now
               * applies this user's text on top, deliberately.
               */
              onConflict: (message) => setConflict(message),
            })
          }}
          uploadImage={cardM.uploadImage}
          uploadAttachment={cardM.uploadAttachment}
          deleteAttachment={cardM.deleteAttachment}
          moveTargets={moveTargets}
          currentMoveKey={currentMoveKey}
        />
      )}
    </div>
  )
}