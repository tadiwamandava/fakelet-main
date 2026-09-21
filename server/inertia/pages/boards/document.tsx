import { Head, Link } from '@inertiajs/react'
import { ArrowLeft } from 'lucide-react'
import RichTextEditor from '~/components/ui/RichTextEditor'
import HiveBanner from '~/components/ui/HiveBanner'
import { useAuth } from '~/lib/auth'

type DocumentProps = {
  board: { id: number; title: string; document: string | null }
}

/**
 * A board's long-form document — lesson notes, planning, whatever several
 * admins work on together.
 *
 * This is the surface collaborative editing is actually for: a persistent page
 * people sit in, rather than a modal one person opens. Admins get the live
 * editor; everyone else gets the same content read-only, so a board can share
 * its notes with students through the ordinary link.
 */
export default function BoardDocument({ board }: DocumentProps) {
  const { isAdmin } = useAuth()

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <Head title={`Notes · ${board.title}`} />

      <header className="relative isolate overflow-hidden bg-white border-b border-line">
        <HiveBanner minimal opacity={0.3} className="h-24" />
        <div className="relative z-10 max-w-3xl mx-auto w-full px-6 sm:px-8 py-5">
          <Link
            href={`/boards/${board.id}`}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-brand mb-2 w-fit"
          >
            <ArrowLeft size={13} />
            Back to {board.title}
          </Link>
          <h1 className="font-serif text-xl text-ink">Notes</h1>
          {isAdmin && (
            <p className="text-xs text-muted mt-0.5">
              Saves as you type, and everyone editing sees it immediately.
            </p>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 p-6 sm:p-8 max-w-3xl mx-auto w-full outline-none">
        {isAdmin ? (
          <RichTextEditor
            document={`board:${board.id}`}
            fallbackHtml={board.document}
            placeholder="Start writing…"
            minHeight="24rem"
          />
        ) : board.document ? (
          /* Sanitised on write, so this renders the markup rather than its source. */
          <div className="prose-hive text-sm text-ink" dangerouslySetInnerHTML={{ __html: board.document }} />
        ) : (
          <p className="text-xs text-muted">Nothing written yet.</p>
        )}
      </main>
    </div>
  )
}
