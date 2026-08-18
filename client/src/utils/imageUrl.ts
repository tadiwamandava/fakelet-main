/**
 * Strips the "/api/v1" suffix off the API base to get the origin that serves
 * uploads. When VITE_API_URL is unset this is "" — i.e. same-origin — so a
 * stored "/uploads/..." path resolves against whatever domain is serving the
 * app, with no rebuild needed per environment.
 */
const serverBase = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/api\/v1\/?$/, '')

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/uploads/')) return `${serverBase}${url}`
  return url
}
