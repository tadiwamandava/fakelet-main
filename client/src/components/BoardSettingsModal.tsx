import { useRef, useState } from 'react'
import { ImagePlus, Link2 } from 'lucide-react'
import Modal from './ui/Modal'
import { useUpdateBoardMeta, useUploadBoardImage } from '../hooks/useBoardMutations'
import { resolveImageUrl } from '../utils/imageUrl'
import type { Board } from '../hooks/useBoard'

interface BoardSettingsModalProps {
  open: boolean
  onClose: () => void
  board: Board
}

export default function BoardSettingsModal({ open, onClose, board }: BoardSettingsModalProps) {
  const updateMeta = useUpdateBoardMeta(board.id)
  const uploadImage = useUploadBoardImage(board.id)

  const [title, setTitle] = useState(board.title)
  const [description, setDescription] = useState(board.description ?? '')
  const [imageUrl, setImageUrl] = useState(board.imageUrl ?? '')
  const [imageTab, setImageTab] = useState<'url' | 'upload'>('url')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setTitle(board.title)
    setDescription(board.description ?? '')
    setImageUrl(board.imageUrl ?? '')
  }

  if (open && title !== board.title && imageUrl !== (board.imageUrl ?? '')) handleOpen()

  function save() {
    updateMeta.mutate(
      { title: title.trim() || board.title, description: description.trim() || null, imageUrl: imageUrl.trim() || null },
      { onSuccess: onClose }
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadImage.mutate(file, {
      onSuccess: (data) => setImageUrl(data.imageUrl),
    })
    e.target.value = ''
  }

  return (
    <Modal open={open} onClose={onClose} title="Board settings">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this board about?"
            rows={3}
            className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand resize-none"
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            Cover image
          </label>

          {/* Tab toggle */}
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
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          )}

          {imageTab === 'upload' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadImage.isPending}
                className="flex items-center gap-2 text-sm border border-dashed border-line rounded-lg px-4 py-3 w-full text-muted hover:border-brand hover:text-brand disabled:opacity-40"
              >
                <ImagePlus size={15} />
                {uploadImage.isPending ? 'Uploading…' : 'Choose image file'}
              </button>
            </div>
          )}

          {imageUrl && (
            <img
              src={resolveImageUrl(imageUrl)}
              alt="Preview"
              className="mt-2 w-full h-32 object-cover rounded-lg border border-line"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}

          {imageUrl && (
            <button
              onClick={() => setImageUrl('')}
              className="text-xs text-muted hover:text-brand mt-1"
            >
              Remove image
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={updateMeta.isPending}
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {updateMeta.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
