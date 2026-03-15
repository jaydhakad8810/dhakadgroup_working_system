// This replaces src/utils/api.js in ALL THREE frontends for production
// The baseURL reads from environment variable set during build

import axios from 'axios'

// In development: uses Vite proxy (/api → localhost:5000)
// In production: uses https://api.dhakadgroup.in/api
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  // Admin uses dg_token, Supervisor uses sv_token, Driver uses dr_token
  const token = localStorage.getItem('dg_token')
    || localStorage.getItem('sv_token')
    || localStorage.getItem('dr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
