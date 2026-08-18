import axios from 'axios'

/**
 * Defaults to a same-origin relative path, so a build works on whatever domain
 * it is served from without being rebuilt. Set VITE_API_URL only when the API
 * lives on a different origin than the app.
 *
 * In development, vite.config.ts proxies /api to the local API server, so this
 * relative path works there too.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
