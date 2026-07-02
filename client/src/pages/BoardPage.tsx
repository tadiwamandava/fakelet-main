import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useBoard } from '../hooks/useBoard'
import { useBookmarks, useBookmarkIds, useToggleBookmark, useSyncBookmarks } from '../hooks/useBookmarks'
import Column from '../components/Column'
import Sidebar from '../components/Sidebar'
import Modal from '../components/ui/Modal'
import BoardSettingsModal from '../components/BoardSettingsModal'
import { Eye, LogIn, LogOut, Menu, Pencil, Plus, Search, Settings } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { useCardMutations, useColumnMutations, useGroupMutations } from '../hooks/useBoardMutations'
import { useTitle } from '../hooks/useTitle'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const boardId = Number(id)
  const { data: board, isLoading, error } = useBoard(boardId)
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
  const cardM = useCardMutations(boardId)
  const columnM = useColumnMutations(boardId)
  const groupM = useGroupMutations(boardId)

  const [searchParams, setSearchParams] = useSearchParams()
  const highlightId = Number(searchParams.get('highlight')) || null
  const activeHighlight = useRef<HTMLElement | null>(null)

  useTitle(board?.title ?? null)

  // Build card title map for bookmark toggle
  const cardTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const col of board?.columns ?? []) {
      for (const card of col.cards ?? []) {
        map.set(card.id, card.title)
      }
      for (const group of col.groups ?? []) {
        for (const card of group.cards ?? []) {
          map.set(card.id, card.title)
        }
      }
    }
    return map
  }, [board])

  // Prune bookmarks pointing at cards that no longer exist (e.g. deleted cards).
  // Runs whenever the board (re)loads, including after a delete refetch.
  useEffect(() => {
    if (!board) return
    syncBookmarks(board.id, Array.from(cardTitleMap.keys()))
  }, [board, cardTitleMap, syncBookmarks])

  // Scroll to and highlight the target card
  useEffect(() => {
    if (!highlightId || !board) return
    // Clear any previously highlighted card first
    if (activeHighlight.current) {
      activeHighlight.current.style.outline = ''
      activeHighlight.current.style.outlineOffset = ''
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
      el.style.outline = '2px solid rgba(145,13,40,0.6)'
      el.style.outlineOffset = '3px'
      el.style.borderRadius = '8px'
      clearTimer = setTimeout(() => {
        el.style.outline = ''
        el.style.outlineOffset = ''
        el.style.borderRadius = ''
        activeHighlight.current = null
        setSearchParams({}, { replace: true })
      }, 2500)
    }

    tryHighlight()

    return () => {
      if (pollTimer) clearTimeout(pollTimer)
      if (clearTimer) clearTimeout(clearTimer)
    }
  }, [highlightId, board])

  if (isLoading) return <p className="p-8 text-muted">Loading board…</p>
  if (error) return <p className="p-8 text-brand">Couldn't load the board. Is the server running?</p>
  if (!board) return null

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
    <div className="h-screen overflow-hidden flex bg-paper">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        board={board}
        bookmarks={bookmarks}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="shrink-0 bg-white border-b border-line px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="md:hidden text-muted hover:text-ink p-1"
          >
            <Menu size={20} />
          </button>

          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              className="w-full bg-paper border border-line rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          {isAdmin && (
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Board settings"
              className="text-muted hover:text-ink border border-line rounded-lg p-2"
            >
              <Settings size={14} />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setEditMode((m) => !m)}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border whitespace-nowrap transition-colors ${
                editMode
                  ? 'bg-gold/15 text-ink border-gold'
                  : 'text-muted border-line hover:text-ink'
              }`}
            >
              {editMode ? <Pencil size={13} /> : <Eye size={13} />}
              <span className="hidden sm:inline">{editMode ? 'Edit mode' : 'Read-only'}</span>
            </button>
          )}

          {isAdmin && editMode && (
            <>
              <button
                onClick={() => setAddingColumn(true)}
                disabled={board.columns.length >= 8}
                className="flex items-center gap-1 text-xs font-medium bg-brand text-white rounded-lg px-3 py-2 disabled:opacity-40 whitespace-nowrap"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">Add column</span>
                {board.columns.length >= 8 && <span className="hidden sm:inline"> (max 8)</span>}
              </button>

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
                to={`/login?redirect=/boards/${boardId}`}
                className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Admin sign in</span>
              </Link>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-3 sm:gap-4 p-3 sm:p-5 items-start">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              bookmarks={bookmarkIds}
              onToggleBookmark={(cardId) => {
                const title = cardTitleMap.get(cardId) ?? 'Untitled'
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
            <p className="text-muted text-sm m-auto">No cards match your search.</p>
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
