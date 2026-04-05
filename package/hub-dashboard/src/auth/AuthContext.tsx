import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { env } from '../env'

interface AuthState {
  authenticated: boolean
  loading: boolean
  permissions: string[]
  isRoot: boolean
}

interface AuthContextValue extends AuthState {
  loginWithPassword: (username: string, password: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
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
    permissions: [],
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
          permissions: data.permissions ?? [],
          isRoot: data.isRoot ?? false,
        })
      } else {
        setState({ authenticated: false, loading: false, permissions: [], isRoot: false })
      }
    } catch {
      setState({ authenticated: false, loading: false, permissions: [], isRoot: false })
    }
  }

  async function handleLoginResponse(res: Response) {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(body.error ?? 'Login failed')
    }
    await checkSession()
  }

  const loginWithPassword = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    })
    await handleLoginResponse(res)
  }, [])

  const loginWithToken = useCallback(async (jwtToken: string) => {
    const res = await fetch(`${env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
    await handleLoginResponse(res)
  }, [])

  const logout = useCallback(async () => {
    await fetch(`${env.VITE_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setState({ authenticated: false, loading: false, permissions: [], isRoot: false })
  }, [])

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (state.isRoot) return true
      return state.permissions.some((p) => {
        if (p === permission) return true
        if (p.endsWith(':*') && permission.startsWith(p.slice(0, -1))) return true
        return false
      })
    },
    [state.permissions, state.isRoot],
  )

  return (
    <AuthContext.Provider value={{ ...state, loginWithPassword, loginWithToken, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
