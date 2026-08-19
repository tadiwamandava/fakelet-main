/**
 * File types accepted as card attachments, and how they are served.
 *
 * Deliberately excludes html and svg: those execute script in the browser, and
 * uploads are served from the app's own origin, so allowing them would let an
 * uploader run code against a signed-in admin's session.
 */
export const ATTACHMENT_EXTNAMES = [
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'txt',
  'csv',
] as const

export const ATTACHMENT_MAX_SIZE = '25mb'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

export function mimeTypeFor(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Images are displayed inline; everything else is sent as a download so the
 * browser never renders an uploaded document in this origin.
 */
export function isInlineType(extension: string): boolean {
  return mimeTypeFor(extension).startsWith('image/')
}
