import { create } from 'zustand'
import api from '../api/client'

export interface User {
  id: number
  username: string
  fullName: string | null
  email: string
  isAdmin: boolean
}

interface SignupData {
  username: string
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

interface ResetPasswordData {
  email: string
  code: string
  password: string
  passwordConfirmation: string
}

interface AuthResponse {
  data: {
    token: string
    user: User
  }
}

interface AuthState {
  user: User | null
  isAdmin: boolean
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  restore: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (data: ResetPasswordData) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  ready: false,

  async login(username, password) {
    const res = await api.post<AuthResponse>('/auth/login', { username, password })
    localStorage.setItem('token', res.data.data.token)
    set({ user: res.data.data.user, isAdmin: !!res.data.data.user.isAdmin })
  },

  async signup({ username, fullName, email, password, passwordConfirmation }) {
    const res = await api.post<AuthResponse>('/auth/signup', {
      username, fullName, email, password, passwordConfirmation,
    })
    localStorage.setItem('token', res.data.data.token)
    set({ user: res.data.data.user, isAdmin: !!res.data.data.user.isAdmin })
  },

  async restore() {
    const token = localStorage.getItem('token')
    if (!token) return set({ ready: true })
    try {
      const res = await api.get<{ data: User }>('/account/profile')
      set({ user: res.data.data, isAdmin: !!res.data.data.isAdmin, ready: true })
    } catch {
      localStorage.removeItem('token')
      set({ ready: true })
    }
  },

  async forgotPassword(email) {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword({ email, code, password, passwordConfirmation }) {
    await api.post('/auth/reset-password', { email, code, password, passwordConfirmation })
  },

  async logout() {
    try {
      await api.post('/account/logout')
    } catch {
      /* token may already be invalid */
    }
    localStorage.removeItem('token')
    set({ user: null, isAdmin: false })
  },
}))
