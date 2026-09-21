import sanitizeHtml from 'sanitize-html'
import { generateHTML, generateJSON } from '@tiptap/html'
import { editorExtensions } from '#shared/editor_schema'

/**
 * What a collaborative editor is allowed to produce, and what a browser is
 * allowed to render.
 *
 * Two separate concerns that have to agree. The extension list defines what the
 * editor can create and is shared with the client, so the HTML the server
 * derives from a Y.Doc matches what the person was actually typing. The
 * allow-list below is the security boundary: admin-authored HTML ends up on the
 * public board, in front of students, so it is sanitised on the way *in* rather
 * than trusted because an admin wrote it. A compromised or careless admin
 * account should not be able to plant a script in a shared link.
 */

/** Tags the editor can produce, and nothing else survives the sanitiser. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'code',
  'pre',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'hr',
]

/**
 * Cleans editor HTML for storage.
 *
 * Links keep only href, and only on schemes that cannot execute — `javascript:`
 * and `data:` are the classic ways an anchor becomes an XSS vector. Every link
 * also picks up `rel="noopener noreferrer"`, since board links point off-site.
 */
export function sanitizeRichText(html: unknown): string {
  if (typeof html !== 'string' || !html.trim()) return ''

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    // Anything the allow-list drops takes its text with it, so a stripped
    // <script> cannot leave its contents behind as visible prose.
    nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  }).trim()
}

/**
 * The readable text inside rich content.
 *
 * Search matches on this rather than the markup, so typing "photosynthesis"
 * cannot be defeated by a bold tag landing mid-word, and a card whose only
 * content is formatting is correctly treated as empty.
 */
export function richTextToPlain(html: unknown): string {
  if (typeof html !== 'string' || !html.trim()) return ''

  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Wraps legacy plain text as HTML.
 *
 * Descriptions written before this feature are bare text whose line breaks came
 * from CSS. Rendered as HTML they would collapse into one run-on paragraph, so
 * each line becomes its own paragraph on the way through.
 */
export function plainTextToRichText(text: unknown): string {
  if (typeof text !== 'string' || !text.trim()) return ''

  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escape(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** True when the content carries no readable text, whatever markup it has. */
export function isRichTextEmpty(html: unknown): boolean {
  return richTextToPlain(html) === ''
}

// ── Tiptap documents ─────────────────────────────────────────────────────────

/**
 * Rich text is stored as a Tiptap document, stringified into a text column.
 *
 * HTML is a *rendering* of a document, not the document: round-tripping through
 * it loses anything the editor knows that HTML cannot express, and it would
 * make the eventual move to a JSONB column a conversion of every row rather
 * than a change of column type. So the document is what is stored, and HTML is
 * produced only at the edge where something needs to display it.
 *
 * The column stays `text` for now, which is what lets rows written before this
 * — bare plain text — keep working untouched. `toDocument` tolerates both.
 */
export type RichDocument = { type: 'doc'; content?: unknown[] }

const EMPTY_DOCUMENT: RichDocument = { type: 'doc', content: [] }

/** A plain string as a document: one paragraph per blank-line-separated block. */
function textAsDocument(text: string): RichDocument {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== '')
  if (blocks.length === 0) return EMPTY_DOCUMENT

  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      /**
       * A single line break inside a block becomes a hardBreak node, matching
       * how the text rendered when the column held CSS-wrapped plain text.
       */
      content: block.split('\n').flatMap((line, index) =>
        index === 0
          ? [{ type: 'text', text: line }]
          : [{ type: 'hardBreak' }, { type: 'text', text: line }]
      ),
    })),
  }
}

/**
 * Reads whatever the column holds.
 *
 * Callers never have to know which shape they got:
 *
 *  - a document written by the editor, as JSON;
 *  - a legacy row of bare plain text, from before rich text existed;
 *  - HTML, which an earlier iteration of this feature stored before the format
 *    settled on JSON.
 *
 * Malformed input is treated as text rather than thrown, mirroring the way
 * `Board.references` falls back to an empty list. A corrupt description should
 * make one card look wrong, not stop a whole board from loading.
 */
export function toDocument(stored: unknown): RichDocument {
  if (stored === null || stored === undefined) return EMPTY_DOCUMENT
  if (typeof stored === 'object') return stored as RichDocument
  if (typeof stored !== 'string' || stored.trim() === '') return EMPTY_DOCUMENT

  const text = stored.trim()

  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text)
      if (parsed && parsed.type === 'doc') return parsed as RichDocument
    } catch {
      // Not JSON after all; fall through and treat it as text.
    }
    return textAsDocument(stored)
  }

  // A tag at the start is the only reliable signal that this is markup.
  if (/^<[a-z][\s\S]*>/i.test(text)) {
    try {
      return generateJSON(sanitizeRichText(text), editorExtensions) as RichDocument
    } catch {
      return textAsDocument(stored)
    }
  }

  return textAsDocument(stored)
}

/**
 * Writes a document back to the column.
 *
 * Also accepts a plain string, because the token API still lets a caller set a
 * description directly and should not have to construct a node tree to do it.
 *
 * When the column becomes JSONB this is the one thing to delete: the driver
 * serialises an object into jsonb on its own.
 */
export function fromDocument(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.trim() === '' ? null : JSON.stringify(toDocument(value))

  return JSON.stringify(value)
}

/**
 * Renders a document to HTML for display.
 *
 * The only place stored content becomes markup, which makes it the single
 * choke point for sanitising. That is the security argument for storing JSON:
 * nothing else in the app ever injects a stored value into a DOM, so there is
 * exactly one line to get right rather than one per render site.
 */
export function documentToHtml(stored: unknown): string {
  const doc = toDocument(stored)
  if (!doc.content || doc.content.length === 0) return ''

  try {
    return sanitizeRichText(generateHTML(doc as never, editorExtensions))
  } catch {
    /**
     * A document the schema cannot render — written by a newer editor, or
     * corrupt — degrades to its readable text rather than breaking the page it
     * appears on.
     */
    return sanitizeRichText(plainTextToRichText(documentToPlain(stored)))
  }
}

/**
 * The readable text inside a document, for search and for measuring previews.
 *
 * Walks the node tree instead of stripping tags from rendered HTML: it avoids
 * a render on every card of every board just to decide whether a description is
 * long enough to truncate.
 */
export function documentToPlain(stored: unknown): string {
  const parts: string[] = []

  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (typeof node.text === 'string') parts.push(node.text)
    if (node.type === 'hardBreak') parts.push(' ')
    if (Array.isArray(node.content)) {
      node.content.forEach(walk)
      // Block boundaries are word boundaries, or adjacent paragraphs run together.
      parts.push(' ')
    }
  }

  walk(toDocument(stored))
  return parts.join('').replace(/\s+/g, ' ').trim()
}

/** True when a document carries no readable text, whatever nodes it holds. */
export function isDocumentEmpty(stored: unknown): boolean {
  return documentToPlain(stored) === ''
}
