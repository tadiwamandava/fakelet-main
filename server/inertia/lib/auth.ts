import { usePage, router } from '@inertiajs/react'

export interface AuthUser {
  id: number
  email: string
  isAdmin: boolean
}

interface AuthState {
  user: AuthUser | null
  isAdmin: boolean
  /**
   * Always true. The SPA needed this to avoid redirecting before its
   * localStorage token was verified; the server now resolves auth before the
   * page renders, so there is nothing to wait for. Kept so existing call sites
   * read unchanged.
   */
  ready: true
  logout: () => void
}

/**
 * Drop-in replacement for the old Zustand auth store, backed by the `auth` prop
 * that #middleware/inertia_middleware shares with every page.
 *
 * Supports both call styles used across the app:
 *   const { user, isAdmin } = useAuth()
 *   const isAdmin = useAuth((s) => s.isAdmin)
 */
export function useAuth(): AuthState
export function useAuth<T>(selector: (state: AuthState) => T): T
export function useAuth<T>(selector?: (state: AuthState) => T): AuthState | T {
  const { auth } = usePage().props as { auth: AuthUser | null }

  const state: AuthState = {
    user: auth,
    isAdmin: !!auth?.isAdmin,
    ready: true,
    logout: () => router.post('/logout'),
  }

  return selector ? selector(state) : state
}
