import sanitizeHtml from 'sanitize-html'

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
