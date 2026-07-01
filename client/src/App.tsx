import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './store/authStore'
import BoardListPage from './pages/BoardListPage'
import BoardPage from './pages/BoardPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const { restore } = useAuth()

  useEffect(() => {
    restore()
  }, [restore])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="/boards" element={<BoardListPage />} />
        <Route path="/boards/:id" element={<BoardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/boards" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
