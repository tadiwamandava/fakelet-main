import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { Bookmark, BookOpen, ChevronDown, ChevronRight, LayoutDashboard, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '~/lib/auth'
import { resolveImageUrl } from '~/utils/imageUrl'
import { useUpdateBoard } from '~/hooks/useBoardMutations'
import HiveBanner from '~/components/ui/HiveBanner'
import logo from '~/assets/k20center-logo-full.svg'
import type { LocalBookmark } from '~/hooks/useBookmarks'

export type BoardData = {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  references?: string[]
}

interface SidebarProps {
  board: BoardData
  bookmarks: LocalBookmark[]
  /** Cards on this board, by id — used to disambiguate same-titled bookmarks. */
  cardIndex?: ReadonlyMap<number, { location: string }>
  /** Opens board settings. Shown to admins as a pencil beside the title. */
  onEditBoard?: () => void
  open: boolean
  onClose: () => void
}

export default function Sidebar({
  board,
  bookmarks,
  cardIndex,
  onEditBoard,
  open,
  onClose,
}: SidebarProps) {
  const isAdmin = useAuth((s) => s.isAdmin)
  const boardBookmarks = bookmarks.filter((b) => b.boardId === board.id)
  const [bookmarksOpen, setBookmarksOpen] = useState(true)

  /**
   * Bookmarks are keyed by card id, so two cards may legitimately carry the
   * same title. Those entries would be indistinguishable in the list, so they
   * get their column shown alongside; unique titles stay uncluttered.
   */
  const repeatedTitles = new Set(
    boardBookmarks
      .map((b) => b.title)
      .filter((title, i, all) => all.indexOf(title) !== i)
  )

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 w-72',
        'md:relative md:w-56 md:translate-x-0',
        'shrink-0 bg-white border-r border-line flex flex-col isolate overflow-hidden',
        'transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <HiveBanner minimal opacity={0.3} className="h-40 !top-auto" />
      <div className="md:hidden flex justify-end px-4 pt-4">
        <button onClick={onClose} aria-label="Close menu" title="Close menu" className="text-muted hover:text-ink p-1">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isAdmin && (
          <Link
            href="/boards"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-brand mb-4"
          >
            <LayoutDashboard size={13} />
            All boards
          </Link>
        )}
        <img src={logo} alt="K20 Center" className="h-8 self-start" />
        <p className="text-xs font-semibold tracking-widest text-brand uppercase mb-4 mt-1" style={{ letterSpacing: '2.9em' }}>
          Hive
        </p>
        <hr className="border-line mb-3" />

        {board.imageUrl && (
          <img
            src={resolveImageUrl(board.imageUrl)}
            alt={board.title}
            loading="lazy"
            decoding="async"
            className="w-full h-28 object-cover rounded-lg border border-line mb-3"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/*
          Editing the board sits next to the thing it edits, matching how
          references are edited further down, rather than as a gear in the
          toolbar with no indication of what it applies to.
        */}
        <div className="flex items-start gap-1.5 mb-1">
          <h1 className="font-serif text-bold text-lg text-ink leading-snug flex-1 min-w-0">
            {board.title}
          </h1>
          {isAdmin && onEditBoard && (
            <button
              onClick={onEditBoard}
              aria-label="Edit board"
              title="Edit board"
              className="text-muted hover:text-ink transition-colors shrink-0 p-0.5 mt-1"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>

        {board.description && (
          <p className="text-xs text-muted leading-relaxed mb-6">{board.description}</p>
        )}
        {!board.description && <div className="mb-6" />}

        <div>
          <button
            onClick={() => setBookmarksOpen((o) => !o)}
            className="flex items-center gap-2 w-full text-sm text-muted hover:text-ink transition-colors mb-2"
          >
            <Bookmark size={14} />
            <span className="font-medium flex-1 text-left">Bookmarks</span>
            {boardBookmarks.length > 0 && (
              <span className="bg-brand text-white text-xs rounded-full px-2 py-0.5">
                {boardBookmarks.length}
              </span>
            )}
            {bookmarksOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {bookmarksOpen && (
            <div className="max-h-40 overflow-y-auto text-xs text-ink space-y-1 pr-0.5">
              {boardBookmarks.length === 0 ? (
                <p className="text-muted">Nothing bookmarked yet.</p>
              ) : (
                boardBookmarks.map((b) => {
                  const where = repeatedTitles.has(b.title)
                    ? cardIndex?.get(b.cardId)?.location
                    : undefined

                  return (
                    <Link
                      key={b.cardId}
                      href={`/boards/${b.boardId}?highlight=${b.cardId}`}
                      onClick={onClose}
                      title={where ? `${b.title} \u2014 ${where}` : b.title}
                      className="flex items-center gap-1.5 truncate rounded px-2 py-1.5 text-muted hover:bg-paper hover:text-brand transition-colors"
                    >
                      <Bookmark size={10} className="shrink-0 text-muted" />
                      <span className="truncate">{b.title}</span>
                      {where && (
                        <span className="shrink-0 max-w-[45%] truncate text-[10px] text-muted/70">
                          {where}
                        </span>
                      )}
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-4">
        <SidebarReferences board={board} />
      </div>
    </aside>
  )
}

function SidebarReferences({ board }: { board: BoardData }) {
  const isAdmin = useAuth((s) => s.isAdmin)
  const updateBoard = useUpdateBoard(board.id)
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>([])

  const references = board.references ?? []

  function startEdit() {
    setDraft([...references])
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft([])
  }

  function save() {
    updateBoard.mutate(
      draft.filter((r) => r.trim()),
      { onSuccess: () => setEditing(false) }
    )
  }

  function setLine(i: number, value: string) {
    setDraft((d) => d.map((r, j) => (j === i ? value : r)))
  }

  function removeLine(i: number) {
    setDraft((d) => d.filter((_, j) => j !== i))
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => !editing && setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-xs font-semibold uppercase tracking-wide text-muted hover:text-ink transition-colors mb-2"
      >
        <BookOpen size={13} />
        <span className="flex-1 text-left">References</span>
        {isAdmin && !editing && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Edit references"
            title="Edit references"
            onClick={(e) => { e.stopPropagation(); startEdit() }}
            onKeyDown={(e) => e.key === 'Enter' && startEdit()}
            className="text-muted hover:text-ink p-0.5"
          >
            <Pencil size={11} />
          </span>
        )}
        {!editing && (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
      </button>

      {!editing && open && (
        references.length === 0 ? (
          <p className="text-xs text-muted">None yet.</p>
        ) : (
          <ol className="max-h-40 overflow-y-auto overflow-x-hidden text-xs text-muted space-y-1 list-decimal list-inside pr-0.5">
            {references.map((ref, i) => (
              <RefItem key={i} text={ref} />
            ))}
          </ol>
        )
      )}

      {editing && (
        <div className="flex flex-col gap-1.5">
          {draft.map((ref, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input
                value={ref}
                onChange={(e) => setLine(i, e.target.value)}
                placeholder={`Reference ${i + 1}`}
                className="flex-1 text-xs bg-paper border border-line rounded px-2 py-1 outline-none focus:border-brand"
              />
              <button
                onClick={() => removeLine(i)}
                aria-label="Remove reference"
                title="Remove reference"
                className="text-muted hover:text-brand shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <button
            onClick={() => setDraft((d) => [...d, ''])}
            className="flex items-center gap-1 text-xs text-muted hover:text-brand mt-0.5"
          >
            <Plus size={11} /> Add reference
          </button>

          <div className="flex gap-1 mt-1">
            <button
              onClick={save}
              disabled={updateBoard.isPending}
              className="text-xs bg-brand text-white rounded px-2.5 py-1 disabled:opacity-40"
            >
              {updateBoard.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              className="text-xs text-muted rounded px-2.5 py-1 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const TRUNCATE_AT = 80

function RefItem({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > TRUNCATE_AT
  return (
    <li className="leading-snug break-all">
      {long && !expanded ? text.slice(0, TRUNCATE_AT) + '…' : text}
      {long && (
        <button
          onClick={() => setExpanded((x) => !x)}
          className="ml-1 text-blue hover:underline whitespace-nowrap"
        >
          {expanded ? 'see less' : 'see more'}
        </button>
      )}
    </li>
  )
}
