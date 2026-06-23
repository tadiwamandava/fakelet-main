import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/authStore'
import BoardListPage from './pages/BoardListPage'
import BoardPage from './pages/BoardPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { user, ready, restore } = useAuth()

  useEffect(() => {
    restore()
  }, [restore])

  if (!ready) return null
  if (!user) return <LoginPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="/boards" element={<BoardListPage />} />
        <Route path="/boards/:id" element={<BoardPage />} />
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
