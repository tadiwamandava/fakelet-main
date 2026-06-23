import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

interface InlineFormProps {
  placeholder?: string
  initialValue?: string
  onSave: (value: string) => void
  onCancel: () => void
  loading?: boolean
}

export default function InlineForm({
  placeholder = 'Title…',
  initialValue = '',
  onSave,
  onCancel,
  loading,
}: InlineFormProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  function submit() {
    const trimmed = value.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={placeholder}
        className="w-full bg-paper border border-brand rounded-lg px-3 py-1.5 text-sm outline-none"
      />
      <div className="flex gap-1">
        <button
          onClick={submit}
          disabled={!value.trim() || loading}
          className="flex items-center gap-1 text-xs bg-brand text-white rounded px-2.5 py-1 disabled:opacity-40"
        >
          <Check size={11} /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-muted rounded px-2.5 py-1 hover:text-ink"
        >
          <X size={11} /> Cancel
        </button>
      </div>
    </div>
  )
}
