import { useEffect, useMemo, useRef, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { useBookmarks, useBookmarkIds, useToggleBookmark, useSyncBookmarks } from '~/hooks/useBookmarks'
import Column from '~/components/Column'
import type { ColumnData } from '~/components/Column'
import Sidebar from '~/components/Sidebar'
import Modal from '~/components/ui/Modal'
import BoardSettingsModal from '~/components/BoardSettingsModal'
import { Check, Eye, LogIn, LogOut, Menu, Pencil, Plus, Search, Settings, Share2 } from 'lucide-react'
import { useAuth } from '~/lib/auth'
import { useCardMutations, useColumnMutations, useGroupMutations } from '~/hooks/useBoardMutations'
import HiveBanner from '~/components/ui/HiveBanner'

type BoardData = {
  id: number
  title: string
  description?: string | null
  imageUrl?: string | null
  references?: string[]
  columns: ColumnData[]
}

type ShowProps = {
  board: BoardData
  highlight: number | null
}

export default function BoardShow({ board, highlight }: ShowProps) {
  const boardId = board.id
  const bookmarks = useBookmarks()
  const bookmarkIds = useBookmarkIds()
  const toggleBookmark = useToggleBookmark()
  const syncBookmarks = useSyncBookmarks()
  const [search, setSearch] = useState('')
  const { user, isAdmin, logout } = useAuth()
  const [editMode, setEditMode] = useState(isAdmin)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  function shareBoard() {
    navigator.clipboard.writeText(`${window.location.origin}/boards/${boardId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }
  const cardM = useCardMutations(boardId)
  const columnM = useColumnMutations(boardId)
  const groupM = useGroupMutations(boardId)

  const highlightId = highlight
  const activeHighlight = useRef<HTMLElement | null>(null)

  /**
   * Every card on the board, by id, with the title and the column (or column
   * and group) it sits in. Bookmarks are keyed by card id, so this is what
   * keeps their stored titles current and lets the sidebar tell apart two
   * bookmarks that happen to share a title.
   */
  const cardIndex = useMemo(() => {
    const map = new Map<number, { title: string; location: string }>()
    for (const col of board?.columns ?? []) {
      for (const card of col.cards ?? []) {
        map.set(card.id, { title: card.title || 'Untitled', location: col.title })
      }
      for (const group of col.groups ?? []) {
        for (const card of group.cards ?? []) {
          map.set(card.id, {
            title: card.title || 'Untitled',
            location: `${col.title} \u203a ${group.title}`,
          })
        }
      }
    }
    return map
  }, [board])

  // Prune bookmarks whose card is gone and refresh the titles of the rest.
  // Runs whenever the board (re)loads, so a rename shows up on the next visit.
  useEffect(() => {
    if (!board) return
    syncBookmarks(board.id, cardIndex)
  }, [board, cardIndex, syncBookmarks])

  // Scroll to and highlight the target card
  useEffect(() => {
    if (!highlightId || !board) return
    // Clear any previously highlighted card first
    if (activeHighlight.current) {
      activeHighlight.current.style.boxShadow = ''
      activeHighlight.current.style.borderRadius = ''
      activeHighlight.current = null
    }

    let pollTimer: ReturnType<typeof setTimeout> | undefined
    let clearTimer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const tryHighlight = () => {
      const el = document.getElementById(`card-${highlightId}`) as HTMLElement | null
      if (!el) {
        // The card may sit in a collapsed group that is still expanding — retry briefly.
        if (attempts++ < 20) pollTimer = setTimeout(tryHighlight, 50)
        return
      }
      activeHighlight.current = el
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Subtle thin halo — a soft 3px translucent crimson glow, matching input focus
      el.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-brand) 25%, transparent)'
      el.style.borderRadius = '8px'
      clearTimer = setTimeout(() => {
        el.style.boxShadow = ''
        el.style.borderRadius = ''
        activeHighlight.current = null
        // Plain history rewrite: an Inertia visit here would refetch the board
        // and remount it mid-animation.
        window.history.replaceState({}, '', window.location.pathname)
      }, 2500)
    }

    tryHighlight()

    return () => {
      if (pollTimer) clearTimeout(pollTimer)
      if (clearTimer) clearTimeout(clearTimer)
    }
  }, [highlightId, board])

  const q = search.trim().toLowerCase()
  const matchesCard = (c: { title: string; description?: string | null }) =>
    c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
  const columns = q
    ? board.columns
        .map((col) => ({
          ...col,
          cards: (col.cards ?? []).filter(matchesCard),
          groups: col.groups
            .map((g) => ({
              ...g,
              cards: g.cards.filter(matchesCard),
            }))
            .filter((g) => g.cards.length > 0),
        }))
        .filter((col) => col.groups.length > 0 || col.cards.length > 0)
    : board.columns

  function submitColumn() {
    const title = newColumnTitle.trim()
    if (!title) return
    columnM.createColumn.mutate(
      { boardId: boardId, title, position: board!.columns.length },
      { onSuccess: () => { setAddingColumn(false); setNewColumnTitle('') } }
    )
  }

  return (
    <div className="h-dvh overflow-hidden flex bg-paper">
      <Head title={board.title} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        board={board}
        bookmarks={bookmarks}
        cardIndex={cardIndex}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 flex flex-col outline-none">
        <div className="shrink-0 bg-white border-b border-line px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            title="Open menu"
            className="md:hidden text-muted hover:text-ink p-1"
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              aria-label="Search cards"
              className="w-full bg-paper border border-line rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={shareBoard}
            aria-label="Copy share link"
            title={linkCopied ? 'Link copied!' : 'Copy link to share'}
            className={`flex items-center gap-1.5 text-xs font-medium bg-white/65 backdrop-blur-md backdrop-saturate-150 shadow-sm border rounded-lg px-3 py-2 whitespace-nowrap transition-colors ${
              linkCopied ? 'border-teal text-teal' : 'text-muted border-line hover:text-ink hover:bg-white/85'
            }`}
          >
            {linkCopied ? <Check size={14} /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{linkCopied ? 'Copied' : 'Share'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Board settings"
              title="Board settings"
              className="text-muted hover:text-ink bg-white/65 backdrop-blur-md backdrop-saturate-150 shadow-sm border border-line rounded-lg p-2 hover:bg-white/85 transition-colors"
            >
              <Settings size={14} />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setEditMode((m) => !m)}
              aria-pressed={editMode}
              aria-label={editMode ? 'Edit mode on, switch to read-only' : 'Read-only, switch to edit mode'}
              className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border whitespace-nowrap transition-colors sm:min-w-[7rem] shadow-sm backdrop-blur-md backdrop-saturate-150 ${
                editMode
                  ? 'bg-[#FBF3DE]/85 text-ink border-gold'
                  : 'bg-white/65 text-muted border-line hover:text-ink hover:bg-white/85'
              }`}
            >
              {editMode ? <Pencil size={13} /> : <Eye size={13} />}
              <span className="hidden sm:inline">{editMode ? 'Edit mode' : 'Read-only'}</span>
            </button>
          )}

          {/* Always reserve this slot so the toggle above doesn't shift; hidden in read-only */}
          {isAdmin && (
            <button
              onClick={() => setAddingColumn(true)}
              disabled={!editMode || board.columns.length >= 8}
              aria-hidden={!editMode}
              tabIndex={editMode ? undefined : -1}
              className={`flex items-center gap-1 text-xs font-medium bg-brand text-white rounded-lg px-3 py-2 disabled:opacity-40 whitespace-nowrap ${
                editMode ? '' : 'invisible pointer-events-none'
              }`}
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add column</span>
              {board.columns.length >= 8 && <span className="hidden sm:inline"> (max 8)</span>}
            </button>
          )}

          {isAdmin && editMode && (
            <>
              <Modal
                open={addingColumn}
                onClose={() => { setAddingColumn(false); setNewColumnTitle('') }}
                title="Add column"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                      Title
                    </label>
                    <input
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitColumn()}
                      placeholder="Column title…"
                      autoFocus
                      className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setAddingColumn(false); setNewColumnTitle('') }}
                      className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitColumn}
                      disabled={!newColumnTitle.trim() || columnM.createColumn.isPending}
                      className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {columnM.createColumn.isPending ? 'Adding…' : 'Add column'}
                    </button>
                  </div>
                </div>
              </Modal>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-auto pl-2 border-l border-line">
              <span className="text-xs text-muted hidden sm:block">
                {user.email}
                {isAdmin && (
                  <span className="ml-1.5 bg-blue/10 text-blue text-[10px] font-medium px-1.5 py-0.5 rounded">Admin</span>
                )}
              </span>
              <button
                onClick={logout}
                aria-label="Sign out"
                className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center ml-auto pl-2 border-l border-line">
              <Link
                href={`/login?redirect=/boards/${boardId}`}
                className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Admin sign in</span>
              </Link>
            </div>
          )}
        </div>

        <div scroll-region="" className="flex-1 overflow-x-auto overflow-y-hidden flex gap-3 sm:gap-4 p-3 sm:p-5 items-start">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              bookmarks={bookmarkIds}
              onToggleBookmark={(cardId) => {
                const title = cardIndex.get(cardId)?.title ?? 'Untitled'
                toggleBookmark(cardId, title, boardId)
              }}
              editMode={editMode && isAdmin}
              cardM={cardM}
              groupM={groupM}
              columnM={columnM}
              highlightId={highlightId}
            />
          ))}
          {columns.length === 0 && (
            <div className="relative isolate overflow-hidden m-auto flex items-center justify-center rounded-2xl px-16 py-20">
              <HiveBanner minimal opacity={0.5} />
              <p className="relative z-10 text-muted text-sm">
                {search.trim() ? 'No cards match your search.' : 'This board is empty.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {board && (
        <BoardSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          board={board}
        />
      )}
    </div>
  )
}
