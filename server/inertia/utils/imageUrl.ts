/**
 * Uploads are served from the same origin as the app now, so a stored
 * "/uploads/..." path needs no rewriting. Kept as a function (rather than
 * inlined at ~6 call sites) so image handling stays in one place — e.g. if
 * uploads ever move to a CDN.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  return url || undefined
}
