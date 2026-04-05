import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Navigation } from './components/Navigation'
import { Overview } from './pages/Overview'
import { Workers } from './pages/Workers'
import { Tasks } from './pages/Tasks'
import { Plugins } from './pages/Plugins'
import { Policies } from './pages/Policies'
import { Users } from './pages/Users'
import { Login } from './pages/Login'
import '@rezics/dispatch-ui/src/theme.css'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
})

function AuthGuard({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--dispatch-bg-secondary)', color: 'var(--dispatch-text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { authenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dispatch-bg-secondary)' }}>
              <Navigation />
              <main style={{ flex: 1, overflow: 'auto' }}>
                <Routes>
                  <Route path="/" element={<Overview />} />
                  <Route path="/workers" element={<Workers />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/plugins" element={<Plugins />} />
                  <Route path="/policies" element={<Policies />} />
                  <Route path="/users" element={<Users />} />
                </Routes>
              </main>
            </div>
          </AuthGuard>
        }
      />
    </Routes>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename="/_dashboard">
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
