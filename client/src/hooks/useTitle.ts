import { useEffect } from 'react'

const APP_NAME = 'K20 Hive'

/**
 * Sets the browser tab title to "<page> — K20 Hive" (or just "K20 Hive" when no
 * page is given), restoring the previous title on unmount. Pass `null` while a
 * value is still loading to avoid a flash of a stale or empty title.
 */
export function useTitle(page: string | null | undefined) {
  useEffect(() => {
    if (page === null || page === undefined) return
    const previous = document.title
    document.title = page ? `${page} — ${APP_NAME}` : APP_NAME
    return () => {
      document.title = previous
    }
  }, [page])
}
