import { useEditor, EditorContent } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import { Bold, Italic, Link2, List, ListOrdered, Quote, Strikethrough } from 'lucide-react'
import { editorExtensions, EDITOR_FIELD } from '#shared/editor_schema'
import { useCollabDocument } from '~/lib/collab'

interface RichTextEditorProps {
  /** Room name: `card:<id>` or `board:<id>`. */
  document: string
  /** Falls back to read-only HTML when collaboration is unavailable. */
  fallbackHtml?: string | null
  placeholder?: string
  /** Taller for a board document than for a card description. */
  minHeight?: string
}

/**
 * A rich-text editor several people can type in at once.
 *
 * There is no save button and no dirty state, on purpose: edits reach everyone
 * else as they are typed and the server persists on a pause. That is the whole
 * point of collaborative editing, and bolting a save step onto it would
 * reintroduce exactly the "who wrote last" question it exists to remove.
 */
export default function RichTextEditor({
  document: documentName,
  fallbackHtml,
  placeholder = 'Start typing…',
  minHeight = '8rem',
}: RichTextEditorProps) {
  const session = useCollabDocument(documentName, true)

  const editor = useEditor(
    {
      /**
       * Rebuilt once the document syncs. Tiptap cannot swap a Collaboration
       * document after construction, so the editor is keyed to the session.
       */
      extensions: session
        ? [
            ...editorExtensions,
            Collaboration.configure({ document: session.doc, field: EDITOR_FIELD }),
            CollaborationCaret.configure({ provider: session.provider, user: session.identity }),
          ]
        : editorExtensions,

      /**
       * Collaboration seeds its own content from the shared document. Passing
       * `content` alongside it would insert a second copy, since a CRDT merges
       * rather than replaces.
       */
      content: session ? undefined : (fallbackHtml ?? ''),
      editable: !!session,
      editorProps: {
        attributes: {
          class: 'prose-hive outline-none px-3 py-2',
          style: `min-height: ${minHeight}`,
          'aria-label': 'Rich text editor',
        },
      },
    },
    [session]
  )

  const button = (label: string, icon: React.ReactNode, active: boolean, run: () => void) => (
    <button
      type="button"
      onClick={run}
      disabled={!editor?.isEditable}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 ${
        active ? 'bg-brand/10 text-brand' : 'text-muted hover:text-ink'
      }`}
    >
      {icon}
    </button>
  )

  return (
    <div className="border border-line rounded-lg bg-paper overflow-hidden">
      <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1 bg-white/60">
        {button('Bold', <Bold size={14} />, !!editor?.isActive('bold'), () =>
          editor?.chain().focus().toggleBold().run()
        )}
        {button('Italic', <Italic size={14} />, !!editor?.isActive('italic'), () =>
          editor?.chain().focus().toggleItalic().run()
        )}
        {button('Strikethrough', <Strikethrough size={14} />, !!editor?.isActive('strike'), () =>
          editor?.chain().focus().toggleStrike().run()
        )}
        <span className="w-px h-4 bg-line mx-1" />
        {button('Bulleted list', <List size={14} />, !!editor?.isActive('bulletList'), () =>
          editor?.chain().focus().toggleBulletList().run()
        )}
        {button('Numbered list', <ListOrdered size={14} />, !!editor?.isActive('orderedList'), () =>
          editor?.chain().focus().toggleOrderedList().run()
        )}
        {button('Quote', <Quote size={14} />, !!editor?.isActive('blockquote'), () =>
          editor?.chain().focus().toggleBlockquote().run()
        )}
        <span className="w-px h-4 bg-line mx-1" />
        {button('Link', <Link2 size={14} />, !!editor?.isActive('link'), () => {
          const existing = editor?.getAttributes('link').href as string | undefined
          const href = window.prompt('Link URL', existing ?? 'https://')
          if (href === null) return
          if (!href.trim()) return editor?.chain().focus().unsetLink().run()
          editor?.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
        })}

        <span className="ml-auto text-[10px] text-muted pr-1">
          {session ? 'Shared' : 'Connecting…'}
        </span>
      </div>

      <EditorContent editor={editor} />

      {editor?.isEmpty && (
        <p className="pointer-events-none px-3 -mt-8 text-sm text-muted select-none">{placeholder}</p>
      )}
    </div>
  )
}
