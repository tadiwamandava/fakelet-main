import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, LayoutDashboard, LogIn, LogOut, Plus, Trash2 } from 'lucide-react'
import { resolveImageUrl } from '../utils/imageUrl'
import { useBoards } from '../hooks/useBoard'
import { useCreateBoard, useDeleteBoard } from '../hooks/useBoardMutations'
import { useAuth } from '../store/authStore'
import Modal from '../components/ui/Modal'
import InvitationsModal from '../components/InvitationsModal'
import logo from '../assets/k20center-logo-full.svg'

export default function BoardListPage() {
  const { data: boards, isLoading, error } = useBoards()
  const { user, isAdmin, logout } = useAuth()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [invitationsOpen, setInvitationsOpen] = useState(false)

  function submitCreate() {
    const title = newTitle.trim()
    if (!title) return
    createBoard.mutate(
      { title, description: newDescription.trim() || undefined },
      { onSuccess: () => { setCreating(false); setNewTitle(''); setNewDescription('') } }
    )
  }

  function confirmDelete(id: number) {
    deleteBoard.mutate(id, {
      onSuccess: () => setConfirmDeleteId(null),
    })
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-line px-4 sm:px-8 py-3 flex items-center gap-4 shrink-0">
        <div className="flex flex-col">
          <img src={logo} alt="K20 Center" className="h-9"/>
          <p className="text-xs font-bold text-brand uppercase mt-1" style={{ letterSpacing: '2.2em' }}>Hive</p>
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <LayoutDashboard size={15} className="text-muted" />
          <h1 className="text-sm font-semibold text-ink">Boards</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-brand text-white rounded-lg px-3 py-1.5"
              >
                <Plus size={13} /> New board
              </button>
              <button
                onClick={() => setInvitationsOpen(true)}
                title="Manage admin invitations"
                className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors"
              >
                <KeyRound size={14} />
              </button>
            </>
          )}
          {user ? (
            <>
              <span className="text-xs text-muted hidden sm:block">
                {user.fullName || user.username}
                {isAdmin && (
                  <span className="ml-1.5 bg-blue/10 text-blue text-[10px] font-medium px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-brand"
              >
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-brand"
            >
              <LogIn size={13} /> Admin sign in
            </Link>
          )}
        </div>
      </header>

      {/* Board grid */}
      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full">
        {isLoading && <p className="text-muted text-sm">Loading boards…</p>}
        {error && <p className="text-brand text-sm">Couldn't load boards. Is the server running?</p>}
        {boards && boards.length === 0 && <p className="text-muted text-sm">No boards yet.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards?.map((board) => (
            <div key={board.id} className="relative group">
              <Link
                to={`/boards/${board.id}`}
                className="block bg-white border border-line rounded-xl overflow-hidden hover:shadow-md hover:border-brand/40 transition-shadow"
              >
                {board.imageUrl ? (
                  <img
                    src={resolveImageUrl(board.imageUrl)}
                    alt={board.title}
                    className="w-full h-28 object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-brand/10 to-brand/5 flex items-center justify-center">
                    <LayoutDashboard size={32} className="text-brand/30" />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-serif font-semibold text-ink group-hover:text-brand transition-colors">
                    {board.title}
                  </h2>
                  <p className="text-xs text-muted mt-1">Open board →</p>
                </div>
              </Link>

              {isAdmin && (
                <button
                  onClick={(e) => { e.preventDefault(); setConfirmDeleteId(board.id) }}
                  aria-label="Delete board"
                  className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-md text-muted hover:text-brand opacity-0 group-hover:opacity-100 transition-opacity border border-line"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* New board modal */}
      <Modal open={creating} onClose={() => { setCreating(false); setNewTitle(''); setNewDescription('') }} title="New board">
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Title</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder="Board title…"
              autoFocus
              className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">Description (optional)</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What is this board about?"
              rows={3}
              className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setCreating(false); setNewTitle(''); setNewDescription('') }}
              className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={submitCreate}
              disabled={!newTitle.trim() || createBoard.isPending}
              className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {createBoard.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <InvitationsModal open={invitationsOpen} onClose={() => setInvitationsOpen(false)} />

      {/* Delete confirmation modal */}
      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete board"
      >
        <p className="text-sm text-ink mb-4">
          This will permanently delete the board and all its columns, groups, and cards. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmDeleteId !== null && confirmDelete(confirmDeleteId)}
            disabled={deleteBoard.isPending}
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {deleteBoard.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
