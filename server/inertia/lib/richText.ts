/**
 * Reading the rich text the editor produces.
 *
 * Card descriptions are sanitised HTML now. The server strips anything
 * dangerous on the way in — scripts, event handlers, javascript: URLs — so what
 * arrives here is already safe to render; these helpers are about presenting it,
 * not about securing it.
 */

/** The readable text, for previews, truncation and length checks. */
export function toPlainText(html: string | null | undefined): string {
  if (!html) return ''

  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when there is no readable text, whatever markup is present. */
export function isEmpty(html: string | null | undefined): boolean {
  return toPlainText(html) === ''
}
