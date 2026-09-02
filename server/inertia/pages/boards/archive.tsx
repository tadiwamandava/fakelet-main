import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { resolveImageUrl } from '~/utils/imageUrl'
import HiveBanner from '~/components/ui/HiveBanner'

type ArchivedCard = {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  /** False when the card's group or column is gone and a destination is needed. */
  hasHome: boolean
  archivedAt: string | null
}

type ArchiveProps = {
  board: { id: number; title: string }
  columns: { id: number; title: string }[]
  cards: ArchivedCard[]
  unattributable: number
}

/**
 * Deleted cards, and the way back.
 *
 * Deleting a card has always been a soft delete, and deleting a group or column
 * archives its cards rather than destroying them, so this content existed all
 * along with nothing able to show it. Master admins only — restoring something
 * someone else deleted is a decision, not routine editing.
 */
export default function BoardArchive({ board, columns, cards, unattributable }: ArchiveProps) {
  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <Head title={`Recycle bin · ${board.title}`} />

      <header className="relative isolate overflow-hidden bg-white border-b border-line">
        <HiveBanner minimal opacity={0.35} />
        <div className="relative z-10 max-w-3xl mx-auto w-full px-6 sm:px-8 py-5">
          <Link
            href={`/boards/${board.id}`}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-brand mb-2 w-fit"
          >
            <ArrowLeft size={13} />
            Back to {board.title}
          </Link>
          <h1 className="font-serif text-xl text-ink">Recycle bin</h1>
          <p className="text-xs text-muted mt-0.5">
            Cards deleted from this board, and cards from columns that were deleted.
          </p>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 p-6 sm:p-8 max-w-3xl mx-auto w-full outline-none">
        {unattributable > 0 && (
          <p className="text-xs text-muted border border-line rounded-lg px-3 py-2 mb-5">
            {unattributable} older card{unattributable === 1 ? '' : 's'} cannot be shown here.
            {' '}They were deleted along with a column before the board was recorded, so there is
            nothing left to say which board they belonged to.
          </p>
        )}

        {cards.length === 0 ? (
          <p className="text-xs text-muted">Nothing deleted from this board.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cards.map((card) => (
              <ArchivedRow key={card.id} card={card} columns={columns} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

function ArchivedRow({ card, columns }: { card: ArchivedCard; columns: ArchiveProps['columns'] }) {
  // A card whose container survived goes straight back; the rest need a home.
  const [columnId, setColumnId] = useState<string>(String(columns[0]?.id ?? ''))
  const [busy, setBusy] = useState(false)

  const restore = () =>
    router.post(
      `/cards/${card.id}/restore`,
      card.hasHome ? {} : { columnId: Number(columnId) },
      { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) }
    )

  const purge = () =>
    window.confirm('Delete this card permanently? This cannot be undone.') &&
    router.delete(`/cards/${card.id}/purge`, {
      preserveScroll: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
    })

  return (
    <li className="bg-white border border-line rounded-xl px-4 py-3 flex items-center gap-3">
      {card.imageUrl && (
        <img
          src={resolveImageUrl(card.imageUrl)}
          alt=""
          className="w-10 h-10 rounded object-cover border border-line shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{card.title || 'Untitled card'}</p>
        <p className="text-xs text-muted truncate">
          {card.archivedAt ? new Date(card.archivedAt).toLocaleString() : ''}
          {!card.hasHome && ' · its column was deleted'}
        </p>
      </div>

      {!card.hasHome && (
        <select
          value={columnId}
          onChange={(e) => setColumnId(e.target.value)}
          aria-label={`Restore ${card.title || 'untitled card'} into`}
          className="text-xs bg-paper border border-line rounded-lg px-2 py-1.5 outline-none focus:border-brand shrink-0 max-w-[9rem]"
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={restore}
          disabled={busy || (!card.hasHome && columns.length === 0)}
          title={columns.length === 0 && !card.hasHome ? 'Add a column first' : 'Restore'}
          className="p-1.5 text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
        >
          <RotateCcw size={15} />
        </button>
        <button
          onClick={purge}
          disabled={busy}
          title="Delete permanently"
          className="p-1.5 text-muted hover:text-brand transition-colors disabled:opacity-30 rounded"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  )
}
