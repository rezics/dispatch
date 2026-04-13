import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { env } from '../env'

interface AuthState {
  authenticated: boolean
  loading: boolean
  isRoot: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    loading: true,
    isRoot: false,
  })

  // Check if session cookie exists on mount by hitting a lightweight endpoint
  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch(`${env.VITE_API_URL}/auth/me`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setState({
          authenticated: true,
          loading: false,
          isRoot: data.isRoot ?? false,
        })
      } else {
        setState({ authenticated: false, loading: false, isRoot: false })
      }
    } catch {
      setState({ authenticated: false, loading: false, isRoot: false })
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(body.error ?? 'Login failed')
    }
    await checkSession()
  }, [])

  const logout = useCallback(async () => {
    await fetch(`${env.VITE_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setState({ authenticated: false, loading: false, isRoot: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
