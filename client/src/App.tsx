import { lazy, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/authStore'
import Tooltips from './components/ui/Tooltips'

// Code-split each page so the initial download stays small on low-end devices
// and slow mobile connections — pages load on demand.
const BoardListPage = lazy(() => import('./pages/BoardListPage'))
const BoardPage = lazy(() => import('./pages/BoardPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

// Admin-only routes. Viewers reach specific boards via shared links only —
// they never browse the board list or the admin dashboard.
function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, ready } = useAuth()
  if (!ready) return null
  if (!isAdmin) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { restore } = useAuth()

  useEffect(() => {
    restore()
  }, [restore])

  return (
    <BrowserRouter>
      {/* Keyboard/screen-reader users can jump straight to the page content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-ink focus:border focus:border-brand focus:rounded-lg focus:px-4 focus:py-2 focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="/boards" element={<RequireAdmin><BoardListPage /></RequireAdmin>} />
          <Route path="/boards/:id" element={<BoardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path="*" element={<Navigate to="/boards" replace />} />
        </Routes>
      </Suspense>
      <Tooltips />
    </BrowserRouter>
  )
}
