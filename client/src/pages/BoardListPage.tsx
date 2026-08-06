import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ImagePlus, KeyRound, LayoutDashboard, Link2, LogIn, LogOut, Plus, Share2, Trash2 } from 'lucide-react'
import { resolveImageUrl } from '../utils/imageUrl'
import { useBoards } from '../hooks/useBoard'
import { useCreateBoard, useDeleteBoard, useUploadImageToBoard } from '../hooks/useBoardMutations'
import { useAuth } from '../store/authStore'
import { useTitle } from '../hooks/useTitle'
import Modal from '../components/ui/Modal'
import HiveBanner from '../components/ui/HiveBanner'
import logo from '../assets/k20center-logo-full.svg'

export default function BoardListPage() {
  const { data: boards, isLoading, error } = useBoards()
  const { user, isAdmin, logout } = useAuth()
  useTitle('Boards')
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const uploadImage = useUploadImageToBoard()

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Local preview: the pasted URL, or an object URL for a chosen-but-not-yet-uploaded file
  const imagePreview = newImageFile ? URL.createObjectURL(newImageFile) : resolveImageUrl(newImageUrl)

  function resetCreate() {
    setCreating(false)
    setNewTitle('')
    setNewDescription('')
    setNewImageUrl('')
    setNewImageFile(null)
    setImageTab('url')
  }

  function shareBoard(id: number) {
    const url = `${window.location.origin}/boards/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000)
  }

  function submitCreate() {
    const title = newTitle.trim()
    if (!title) return
    createBoard.mutate(
      {
        title,
        description: newDescription.trim() || undefined,
        // A pasted URL goes in with the create; an uploaded file is sent after (needs the id)
        imageUrl: !newImageFile && newImageUrl.trim() ? newImageUrl.trim() : undefined,
      },
      {
        onSuccess: (board) => {
          if (newImageFile) {
            uploadImage.mutate(
              { boardId: board.id, file: newImageFile },
              { onSuccess: resetCreate, onError: resetCreate }
            )
          } else {
            resetCreate()
          }
        },
      }
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewImageFile(file)
    setNewImageUrl('')
    e.target.value = ''
  }

  function confirmDelete(id: number) {
    deleteBoard.mutate(id, {
      onSuccess: () => setConfirmDeleteId(null),
    })
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      {/* Header */}
      <header className="relative isolate overflow-hidden bg-white border-b border-line px-4 sm:px-8 py-3 flex items-center gap-4 shrink-0">
        <HiveBanner />
        <div className="flex items-center gap-1.5 flex-1">
          <LayoutDashboard size={15} className="text-muted" />
          <h1 className="text-sm font-semibold text-ink">Boards</h1>
        </div>
        <div
          className="relative flex flex-col items-center shrink-0 px-8"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0) 82%)' }}
        >
          <img src={logo} alt="K20 Center" className="h-9"/>
          <p className="text-xs font-bold text-brand uppercase mt-1" style={{ letterSpacing: '2.2em', paddingLeft: '2.2em' }}>Hive</p>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          {isAdmin && (
            <>
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 text-xs font-medium bg-brand text-white rounded-lg px-3 py-1.5"
              >
                <Plus size={13} /> New board
              </button>
              <Link
                to="/admin"
                title="Admin dashboard"
                className="flex items-center gap-1 text-xs text-muted hover:text-brand transition-colors"
              >
                <KeyRound size={14} />
              </Link>
            </>
          )}
          {user ? (
            <>
              <span className="text-xs text-muted hidden sm:block">
                {user.email}
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
      <main id="main-content" tabIndex={-1} className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full outline-none">
        {isLoading && <p className="text-muted text-sm">Loading boards…</p>}
        {error && <p className="text-brand text-sm">Couldn't load boards. Please contact the administrator.</p>}
        {boards && boards.length === 0 && (
          <div className="relative isolate overflow-hidden flex items-center justify-center rounded-2xl py-24">
            <HiveBanner minimal opacity={0.55} />
            <p className="relative z-10 text-muted text-sm">No boards yet.</p>
          </div>
        )}

        {/* Masonry: cards pack tightly with varying heights from different image sizes */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 [column-fill:_balance]">
          {boards?.map((board) => (
            <div key={board.id} className="relative group mb-3 break-inside-avoid">
              <Link
                to={`/boards/${board.id}`}
                className="block bg-white border border-line rounded-xl overflow-hidden hover:shadow-md hover:border-brand/40 transition-shadow"
              >
                {board.imageUrl ? (
                  <img
                    src={resolveImageUrl(board.imageUrl)}
                    alt={board.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto"
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

              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  onClick={(e) => { e.preventDefault(); shareBoard(board.id) }}
                  aria-label="Copy share link"
                  title={copiedId === board.id ? 'Link copied!' : 'Copy link to share'}
                  className="p-1.5 bg-white/65 backdrop-blur-md backdrop-saturate-150 shadow-sm rounded-md text-muted hover:text-brand hover:bg-white/85 transition-colors border border-white/60"
                >
                  {copiedId === board.id ? <Check size={13} className="text-teal" /> : <Share2 size={13} />}
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => { e.preventDefault(); setConfirmDeleteId(board.id) }}
                    aria-label="Delete board"
                    title="Delete board"
                    className="p-1.5 bg-white/65 backdrop-blur-md backdrop-saturate-150 shadow-sm rounded-md text-muted hover:text-brand hover:bg-white/85 hover-reveal transition-opacity border border-white/60"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New board modal */}
      <Modal open={creating} onClose={resetCreate} title="New board">
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

          {/* Cover image (optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-2">Cover image (optional)</label>
            <div className="flex gap-1 bg-paper border border-line rounded-lg p-1 mb-3 w-fit">
              {(['url', 'upload'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setImageTab(tab)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md ${
                    imageTab === tab ? 'bg-white text-ink shadow-sm font-medium' : 'text-muted'
                  }`}
                >
                  {tab === 'url' ? <Link2 size={11} /> : <ImagePlus size={11} />}
                  {tab === 'url' ? 'URL' : 'Upload'}
                </button>
              ))}
            </div>

            {imageTab === 'url' && (
              <input
                value={newImageUrl}
                onChange={(e) => { setNewImageUrl(e.target.value); setNewImageFile(null) }}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            )}

            {imageTab === 'upload' && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm border border-dashed border-line rounded-lg px-4 py-3 w-full text-muted hover:border-brand hover:text-brand"
                >
                  <ImagePlus size={15} />
                  {newImageFile ? newImageFile.name : 'Choose image file'}
                </button>
              </>
            )}

            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-full h-32 object-cover rounded-lg border border-line"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <button
                  onClick={() => { setNewImageUrl(''); setNewImageFile(null) }}
                  className="text-xs text-muted hover:text-brand mt-1"
                >
                  Remove image
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetCreate}
              className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink"
            >
              Cancel
            </button>
            <button
              onClick={submitCreate}
              disabled={!newTitle.trim() || createBoard.isPending || uploadImage.isPending}
              className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {createBoard.isPending || uploadImage.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

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
