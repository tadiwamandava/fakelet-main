import { useState, useCallback, useEffect } from 'react'

export interface LocalBookmark {
  cardId: number
  title: string
  boardId: number
}

const KEY = 'fakelet_bookmarks'

function load(): LocalBookmark[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

// Shared cache + listeners so all components stay in sync without a context
let cache: LocalBookmark[] = load()
const listeners = new Set<() => void>()

function notify() { listeners.forEach((fn) => fn()) }

function persist(next: LocalBookmark[]) {
  cache = next
  localStorage.setItem(KEY, JSON.stringify(next))
  notify()
}

export function useBookmarks(): LocalBookmark[] {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return cache
}

export function useBookmarkIds(): number[] {
  return useBookmarks().map((b) => b.cardId)
}

export function useToggleBookmark() {
  return useCallback((cardId: number, title: string, boardId: number) => {
    const exists = cache.some((b) => b.cardId === cardId)
    persist(exists ? cache.filter((b) => b.cardId !== cardId) : [...cache, { cardId, title, boardId }])
  }, [])
}

/**
 * Reconciles one board's bookmarks against the cards it currently holds.
 *
 * A bookmark stores a copy of the card's title so the sidebar can render it
 * without the card, but that copy goes stale the moment the card is renamed.
 * Passing the board's live cards does both jobs in one pass: bookmarks whose
 * card is gone are dropped, and the ones that remain have their title
 * refreshed. Bookmarks on other boards are left alone — this only ever sees
 * the board currently open.
 */
export function useSyncBookmarks() {
  return useCallback((boardId: number, cards: ReadonlyMap<number, { title: string }>) => {
    let changed = false

    const next = cache.flatMap<LocalBookmark>((b) => {
      if (b.boardId !== boardId) return [b]

      const card = cards.get(b.cardId)
      if (!card) {
        changed = true
        return []
      }
      if (card.title === b.title) return [b]

      changed = true
      return [{ ...b, title: card.title }]
    })

    if (changed) persist(next)
  }, [])
}
