import { usePage, router } from '@inertiajs/react'

export interface AuthUser {
  id: number
  email: string
  isAdmin: boolean
  /**
   * Master admins own access control — granting and revoking admin, and
   * removing accounts. Master implies admin, so `isAdmin` still answers "can
   * this person edit boards" and nothing that reads it needs to change.
   */
  isMasterAdmin: boolean
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
  const { auth } = usePage().props as unknown as { auth: AuthUser | null }

  const state: AuthState = {
    user: auth,
    isAdmin: !!auth?.isAdmin,
    ready: true,
    /**
     * Tells the server where the sign-out happened, so signing out on a shared
     * board leaves you on it as a student sees it. The server decides whether
     * that page is actually public — anywhere else still lands on /login.
     */
    logout: () => router.post('/logout', { redirect: window.location.pathname }),
  }

  return selector ? selector(state) : state
}
