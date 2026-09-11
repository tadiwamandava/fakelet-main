import StarterKit from '@tiptap/starter-kit'

/**
 * The one definition of what a Hive rich-text editor can contain.
 *
 * Shared deliberately. The browser builds the editor from this, and the server
 * renders the same Y.Doc to HTML from it when persisting — two lists would
 * drift, and the symptom would be content silently changing shape the moment
 * the last editor disconnects and the server writes its own idea of the HTML.
 */
export const editorExtensions = [
  StarterKit.configure({
    /**
     * Collaboration supplies its own history. The shared one has to undo *your*
     * last change rather than whatever the document did last, which the
     * single-user history cannot know.
     */
    undoRedo: false,

    /**
     * StarterKit already bundles Link, so it is configured here rather than
     * registered again — a second copy warns about a duplicate extension name
     * and leaves which one wins up to registration order.
     *
     * The protocols match the sanitiser's allow-list, so the editor refuses to
     * create links that would be stripped on save anyway.
     */
    link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
  }),
]

/** The Y.Doc field both sides bind the document body to. */
export const EDITOR_FIELD = 'default'
