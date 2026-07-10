import { ReactNode, useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    // Remember what had focus so we can restore it when the dialog closes.
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      // Keep Tab focus inside the dialog (focus trap).
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const firstEl = nodes[0]
      const lastEl = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 id={titleId} className="font-serif text-lg text-ink">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
