import { ReactNode, useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

/**
 * How many dialogs are currently open.
 *
 * A dialog covers the page behind it, so anything that announces itself up
 * there — a banner, a toast — is both invisible and, for a screen reader, a
 * second copy of what the dialog is already saying. Tracking the count in a
 * module-level store lets those components step aside; it follows the same
 * shape as the bookmark cache rather than introducing a context for one flag.
 */
let openCount = 0
const listeners = new Set<() => void>()

function setOpenCount(next: number) {
  openCount = next
  listeners.forEach((fn) => fn())
}

/** True while any Modal is on screen. */
export function useAnyModalOpen(): boolean {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return openCount > 0
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /**
   * Whether the dialog holds edits that have not been saved.
   *
   * When it does, the dismissals that are easy to trigger by accident stop
   * throwing that work away: a click on the page behind is ignored outright,
   * and the deliberate ones ask first. Dialogs with nothing to lose — a delete
   * confirmation, say — leave this unset and close as freely as before.
   */
  dirty?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children, dirty = false }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  /**
   * Closing is deliberate only: the close button, or a Cancel the dialog
   * supplies itself.
   *
   * The backdrop used to close on click, and that was worse than it sounds.
   * Press inside a field, drag to select text, release past the dialog's edge,
   * and the browser fires the click on the common ancestor — the backdrop — so
   * selecting a word could throw the dialog away. Guarding it for unsaved edits
   * only narrowed that; the dismissal itself was the problem.
   *
   * Unsaved edits still prompt, because the close button is aimed on purpose
   * and the question is then worth asking.
   */
  function requestClose() {
    if (!dirty) return onClose()
    if (window.confirm('Discard your unsaved changes?')) onClose()
  }

  useEffect(() => {
    if (!open) return

    // Remember what had focus so we can restore it when the dialog closes.
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      /**
       * Escape deliberately does not close. The close button is reachable by
       * keyboard — the trap below cycles focus rather than holding it — so this
       * is unconventional rather than a dead end, but it is the price of one
       * exit that cannot be triggered by accident.
       */
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
    setOpenCount(openCount + 1)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      setOpenCount(Math.max(0, openCount - 1))
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  // The backdrop only dims the page — it carries no click handler.
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden outline-none flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 id={titleId} className="font-serif text-lg text-ink">{title}</h3>
          <button onClick={requestClose} aria-label="Close dialog" title="Close" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
