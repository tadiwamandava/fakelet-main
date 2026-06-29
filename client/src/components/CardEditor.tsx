import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ImagePlus, Link2, Play } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import Modal from './ui/Modal'
import type { CardData, CardUpdateInput } from './Card'

type FieldKey = 'title' | 'description' | 'linkUrl' | 'linkTitle'
type MediaMode = 'none' | 'image' | 'youtube'
type ImageTab = 'url' | 'upload'

interface FieldDef { key: FieldKey; label: string; textarea?: boolean }
type FormState = Partial<Record<FieldKey, string>>

interface CardEditorProps {
  open: boolean
  onClose: () => void
  card: CardData
  onSave: (data: CardUpdateInput) => void
  saving: boolean
  uploadImage?: UseMutationResult<{ imageUrl: string }, Error, { cardId: number; file: File }>
}

const FIELDS: FieldDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', textarea: true },
  { key: 'linkUrl', label: 'Link URL' },
  { key: 'linkTitle', label: 'Link label' },
]

function initialMediaMode(card: CardData): MediaMode {
  if (card.imageUrl) return 'image'
  if (card.youtubeUrl) return 'youtube'
  return 'none'
}

export default function CardEditor({ open, onClose, card, onSave, saving, uploadImage }: CardEditorProps) {
  const [form, setForm] = useState<FormState>({})
  const [mediaMode, setMediaMode] = useState<MediaMode>('none')
  const [imageUrl, setImageUrl] = useState('')
  const [imageTab, setImageTab] = useState<ImageTab>('url')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setForm({
      title: card.title || '',
      description: card.description || '',
      linkUrl: card.linkUrl || '',
      linkTitle: card.linkTitle || '',
    })
    setMediaMode(initialMediaMode(card))
    setImageUrl(card.imageUrl || '')
    setYoutubeUrl(card.youtubeUrl || '')
  }

  if (open && form.title === undefined) handleOpen()

  const set = (key: FieldKey) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function selectMedia(mode: MediaMode) {
    setMediaMode(mode)
    if (mode !== 'image') { setImageUrl('') }
    if (mode !== 'youtube') { setYoutubeUrl('') }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadImage) return
    uploadImage.mutate({ cardId: card.id, file }, { onSuccess: (data) => setImageUrl(data.imageUrl) })
    e.target.value = ''
  }

  function handleSave() {
    onSave({
      id: card.id,
      ...form,
      imageUrl: mediaMode === 'image' ? (imageUrl || null) : null,
      youtubeUrl: mediaMode === 'youtube' ? (youtubeUrl || null) : null,
    })
  }

  const tabBtn = (mode: MediaMode, label: string, icon: React.ReactNode) => (
    <button
      key={mode}
      onClick={() => selectMedia(mode)}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md ${
        mediaMode === mode ? 'bg-white text-ink shadow-sm font-medium' : 'text-muted'
      }`}
    >
      {icon}{label}
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title="Edit card">
      <div className="flex flex-col gap-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
              {field.label}
            </label>
            {field.textarea ? (
              <textarea
                rows={3}
                value={form[field.key] ?? ''}
                onChange={set(field.key)}
                className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand resize-y"
              />
            ) : (
              <input
                value={form[field.key] ?? ''}
                onChange={set(field.key)}
                className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
              />
            )}
          </div>
        ))}

        {/* Media — mutually exclusive: image or YouTube */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            Media
          </label>
          <div className="flex gap-1 bg-paper border border-line rounded-lg p-1 mb-3 w-fit">
            {tabBtn('none', 'None', null)}
            {tabBtn('image', 'Image', <ImagePlus size={11} />)}
            {tabBtn('youtube', 'YouTube', <Play size={11} />)}
          </div>

          {mediaMode === 'image' && (
            <>
              <div className="flex gap-1 bg-paper border border-line rounded-lg p-1 mb-2 w-fit">
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
                <>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadImage?.isPending}
                    className="flex items-center gap-2 text-sm border border-dashed border-line rounded-lg px-4 py-3 w-full text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                  >
                    <ImagePlus size={15} />
                    {uploadImage?.isPending ? 'Uploading…' : 'Choose image file'}
                  </button>
                </>
              )}

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="mt-2 w-full h-24 object-cover rounded-lg border border-line"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
            </>
          )}

          {mediaMode === 'youtube' && (
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm text-muted px-4 py-2 rounded-lg hover:text-ink">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title?.trim()}
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
