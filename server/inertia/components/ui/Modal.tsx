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
   * Closes, unless that would silently discard something.
   *
   * A click on the backdrop is nearly always a miss — reaching for the board
   * behind, or catching the edge of a phone screen — so while there are unsaved
   * edits it does nothing at all. The close button and Escape are aimed
   * deliberately, so they ask rather than refuse; either way the way out is
   * never more than one more click.
   */
  function requestClose(deliberate: boolean) {
    if (!dirty) return onClose()
    if (!deliberate) return
    if (window.confirm('Discard your unsaved changes?')) onClose()
  }

  // Keep the latest handler without making it an effect dependency — otherwise a
  // new inline callback on every parent render would re-run the effect (and its
  // focus-restore cleanup) on each keystroke, kicking focus out of the inputs.
  const onCloseRef = useRef(requestClose)
  onCloseRef.current = requestClose

  useEffect(() => {
    if (!open) return

    // Remember what had focus so we can restore it when the dialog closes.
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialog)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current(true)
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
    setOpenCount(openCount + 1)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      setOpenCount(Math.max(0, openCount - 1))
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={() => requestClose(false)}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-line rounded-2xl w-full max-w-md shadow-xl overflow-hidden outline-none flex flex-col max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 id={titleId} className="font-serif text-lg text-ink">{title}</h3>
          <button onClick={() => requestClose(true)} aria-label="Close dialog" title="Close" className="text-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
