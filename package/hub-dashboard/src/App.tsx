import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/ThemeProvider'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Navigation } from './components/Navigation'
import { Overview } from './pages/Overview'
import { Workers } from './pages/Workers'
import { Tasks } from './pages/Tasks'
import { Plugins } from './pages/Plugins'
import { Users } from './pages/Users'
import { Login } from './pages/Login'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
})

function LoadingShell() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground">
      <div aria-hidden className="absolute inset-0 bg-grid-dots opacity-60" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative h-1 w-56 overflow-hidden border border-border">
          <div
            className="absolute inset-y-0 w-1/3 animate-sweep"
            style={{ backgroundColor: 'var(--color-signal-amber)' }}
          />
        </div>
        <div className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
          Dispatch // establishing link
        </div>
      </div>
    </div>
  )
}

function AuthGuard({ children }: { children: ReactNode }) {
  const { authenticated, loading } = useAuth()

  if (loading) return <LoadingShell />

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
            <div className="relative flex min-h-screen bg-background text-foreground">
              <div
                aria-hidden
                className="pointer-events-none fixed inset-0 bg-grid-dots opacity-[0.35]"
                style={{ maskImage: 'linear-gradient(to bottom, black, rgba(0,0,0,0.4))' }}
              />
              <div
                aria-hidden
                className="pointer-events-none fixed inset-0 bg-grain opacity-[0.6] mix-blend-overlay"
              />
              <Navigation />
              <main className="relative flex-1 overflow-auto">
                <div className="mx-auto w-full max-w-7xl px-6 py-6 md:px-10 md:py-8">
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/workers" element={<Workers />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/plugins" element={<Plugins />} />
                    <Route path="/users" element={<Users />} />
                  </Routes>
                </div>
                <footer className="border-t border-border/60 px-6 py-5 md:px-10">
                  <div className="mx-auto flex w-full max-w-7xl items-center justify-between font-mono text-[10px] tracking-wider-caps text-muted-foreground">
                    <span>// Dispatch Signal Room</span>
                    <span>
                      uplink{' '}
                      <span
                        className="ml-1 inline-block size-1.5 rounded-full align-middle"
                        style={{
                          backgroundColor: 'var(--color-signal-phosphor)',
                          boxShadow: '0 0 6px var(--color-signal-phosphor)',
                        }}
                      />
                    </span>
                  </div>
                </footer>
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
