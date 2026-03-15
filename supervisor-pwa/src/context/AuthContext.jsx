import { createContext, useContext, useState } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sv_user')) } catch { return null }
  })

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.user.role !== 'supervisor' && data.user.role !== 'admin') throw new Error('Not a supervisor account')
    localStorage.setItem('sv_token', data.token)
    localStorage.setItem('sv_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('sv_token')
    localStorage.removeItem('sv_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
