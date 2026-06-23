const serverBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1')
  .replace('/api/v1', '')

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/uploads/')) return `${serverBase}${url}`
  return url
}
