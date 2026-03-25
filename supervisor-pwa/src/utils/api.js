import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token') || sessionStorage.getItem('sv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (err.response?.data?.code === 'SESSION_EXPIRED') {
        localStorage.clear(); sessionStorage.clear()
        alert('You were logged out. Another device logged in with your account.')
        window.location.href = '/login'
        return Promise.reject(err)
      }
      localStorage.removeItem('sv_token'); localStorage.removeItem('sv_user')
      sessionStorage.removeItem('sv_token'); sessionStorage.removeItem('sv_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
