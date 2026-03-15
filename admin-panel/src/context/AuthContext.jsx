import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('dg_user')
    return u ? JSON.parse(u) : null
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('dg_token', data.token)
      localStorage.setItem('dg_user', JSON.stringify(data.user))
      setUser(data.user)
      return data
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('dg_token')
    localStorage.removeItem('dg_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
