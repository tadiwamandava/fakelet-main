import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/authStore'
import BoardListPage from './pages/BoardListPage'
import BoardPage from './pages/BoardPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'

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
      <Routes>
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="/boards" element={<RequireAdmin><BoardListPage /></RequireAdmin>} />
        <Route path="/boards/:id" element={<BoardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
