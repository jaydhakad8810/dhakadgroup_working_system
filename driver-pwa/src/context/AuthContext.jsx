import { createContext, useContext, useState } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dr_user')) } catch { return null }
  })

  const login = async (identifier, password) => {
    const payload = identifier.includes('@') ? { email: identifier, password } : { employee_id: identifier, password }
    const { data } = await api.post('/auth/login', payload)
    if (data.user.role !== 'driver' && data.user.role !== 'admin') throw new Error('Not a driver account')
    localStorage.setItem('dr_token', data.token)
    localStorage.setItem('dr_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('dr_token'); localStorage.removeItem('dr_user'); setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
