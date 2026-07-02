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

// Drop bookmarks for a board whose cards no longer exist (e.g. deleted cards)
export function useSyncBookmarks() {
  return useCallback((boardId: number, validCardIds: number[]) => {
    const valid = new Set(validCardIds)
    const next = cache.filter((b) => b.boardId !== boardId || valid.has(b.cardId))
    if (next.length !== cache.length) persist(next)
  }, [])
}
