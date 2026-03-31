import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/ThemeProvider'
import { Navigation } from './components/Navigation'
import { Status } from './pages/Status'
import { Tasks } from './pages/Tasks'
import { Config } from './pages/Config'
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
        <BrowserRouter>
          <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dispatch-bg-secondary)' }}>
            <Navigation />
            <main style={{ flex: 1, overflow: 'auto' }}>
              <Routes>
                <Route path="/" element={<Status />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/config" element={<Config />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
