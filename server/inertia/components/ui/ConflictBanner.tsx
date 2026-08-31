import { useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { AlertTriangle, X } from 'lucide-react'
import { useAnyModalOpen } from '~/components/ui/Modal'

/**
 * Tells an editor that their last action was refused because someone else on
 * the board got there first.
 *
 * Writes that lose a race still redirect, so the page looks like it saved; the
 * server signals the refusal through the `conflict` flash instead. Without
 * something reading it, a delete or rename would appear to work and then be
 * absent on the next load — the "it just disappeared" case. The redirect has
 * already replaced the stale props, so by the time this renders the board on
 * screen is correct and only the explanation is missing.
 */
export default function ConflictBanner() {
  const page = usePage() as unknown as { flash?: { conflict?: string } }
  const message = page.flash?.conflict
  const [dismissed, setDismissed] = useState<string | null>(null)

  /**
   * A card editor reports its own conflict inline, where the user is actually
   * looking. Repeating it back here would be hidden behind the dialog anyway,
   * and announced twice to a screen reader.
   */
  const modalOpen = useAnyModalOpen()

  // A new conflict re-opens the banner even if the last one was dismissed.
  useEffect(() => {
    if (message) setDismissed(null)
  }, [message])

  if (!message || modalOpen || dismissed === message) return null

  return (
    <div
      role="alert"
      className="shrink-0 flex items-start gap-2 border-b border-brand/30 bg-brand/5 px-3 sm:px-5 py-2 text-xs text-brand"
    >
      <AlertTriangle size={14} className="shrink-0 mt-px" />
      <p className="flex-1 leading-relaxed">
        <span className="font-semibold">Not saved. </span>
        {message} The board below has been refreshed.
      </p>
      <button
        onClick={() => setDismissed(message)}
        aria-label="Dismiss"
        title="Dismiss"
        className="shrink-0 text-brand/70 hover:text-brand p-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}
