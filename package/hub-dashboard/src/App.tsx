import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/ThemeProvider'
import { Navigation } from './components/Navigation'
import { Overview } from './pages/Overview'
import { Workers } from './pages/Workers'
import { Tasks } from './pages/Tasks'
import { Plugins } from './pages/Plugins'
import '@rezics/dispatch-ui/src/theme.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter basename="/_dashboard">
          <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dispatch-bg-secondary)' }}>
            <Navigation />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/plugins" element={<Plugins />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
