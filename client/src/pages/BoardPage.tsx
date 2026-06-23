import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBoard } from '../hooks/useBoard'
import { useBookmarks, useToggleBookmark } from '../hooks/useBookmarks'
import Column from '../components/Column'
import Sidebar from '../components/Sidebar'
import Modal from '../components/ui/Modal'
import BoardSettingsModal from '../components/BoardSettingsModal'
import { Eye, Menu, Pencil, Plus, Search, Settings } from 'lucide-react'
import { useAuth } from '../store/authStore'
import { useCardMutations, useColumnMutations, useGroupMutations } from '../hooks/useBoardMutations'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const boardId = Number(id)
  const { data: board, isLoading, error } = useBoard(boardId)
  const { data: bookmarks = [] } = useBookmarks()
  const toggleBookmarkMutation = useToggleBookmark()
  const [search, setSearch] = useState('')
  const isAdmin = useAuth((s) => s.isAdmin)
  const [editMode, setEditMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const cardM = useCardMutations(boardId)
  const columnM = useColumnMutations(boardId)
  const groupM = useGroupMutations(boardId)

  if (isLoading) return <p className="p-8 text-muted">Loading board…</p>
  if (error) return <p className="p-8 text-brand">Couldn't load the board. Is the server running?</p>
  if (!board) return null

  const allCards = board.columns.flatMap((col) => col.groups.flatMap((g) => g.cards))

  const q = search.trim().toLowerCase()
  const columns = q
    ? board.columns
        .map((col) => ({
          ...col,
          groups: col.groups
            .map((g) => ({
              ...g,
              cards: g.cards.filter(
                (c) =>
                  c.title.toLowerCase().includes(q) ||
                  (c.description || '').toLowerCase().includes(q)
              ),
            }))
            .filter((g) => g.cards.length > 0),
        }))
        .filter((col) => col.groups.length > 0)
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
        allCards={allCards}
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
              className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 border whitespace-nowrap ${
                editMode
                  ? 'bg-brand-light text-brand border-brand'
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
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-3 sm:gap-4 p-3 sm:p-5 items-start">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              bookmarks={bookmarks}
              onToggleBookmark={(id) => toggleBookmarkMutation.mutate(id)}
              editMode={editMode && isAdmin}
              cardM={cardM}
              groupM={groupM}
              columnM={columnM}
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
