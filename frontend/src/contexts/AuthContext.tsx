import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, senha: string) => Promise<boolean>
  register: (data: any) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, senha: string) => {
    const res = await api.auth.login(email, senha)
    setUser(res.usuario)
    return !!res.forcar_troca_senha
  }

  const register = async (data: any) => {
    const res = await api.auth.register(data)
    setUser(res.usuario)
    return !!res.forcar_troca_senha
  }

  const logout = () => {
    api.auth.logout().catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
