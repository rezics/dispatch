import { createRoot } from 'react-dom/client'
import { TaskCard } from '../src/task-card/TaskCard'
import { WorkerBadge } from '../src/worker-badge/WorkerBadge'
import { LogPanel } from '../src/log-panel/LogPanel'
import { QueueChart } from '../src/queue-chart/QueueChart'
import '../src/theme.css'

function App() {
  const toggleTheme = () => {
    const html = document.documentElement
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark'
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', fontFamily: 'var(--dispatch-font-family)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: 'var(--dispatch-text-primary)' }}>Dispatch UI Preview</h1>
        <button onClick={toggleTheme}>Toggle Theme</button>
      </div>

      <h2 style={{ color: 'var(--dispatch-text-primary)' }}>TaskCard</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <TaskCard id="abc12345-6789" type="book:crawl" status="pending" statusLabel="Pending" priority={5} createdAt="2025-01-01 12:00" />
        <TaskCard id="def12345-6789" type="anime:crawl" status="running" statusLabel="Running" priority={3} progress={{ percent: 60, message: 'Parsing' }} createdAt="2025-01-01 11:00" startedAt="2025-01-01 11:05" />
        <TaskCard id="ghi12345-6789" type="book:update" status="done" statusLabel="Done" priority={1} createdAt="2025-01-01 10:00" startedAt="2025-01-01 10:01" finishedAt="2025-01-01 10:05" workerId="worker-1234-5678" />
        <TaskCard id="jkl12345-6789" type="anime:update" status="failed" statusLabel="Failed" priority={2} createdAt="2025-01-01 09:00" error="Connection timeout after 30s" />
      </div>

      <h2 style={{ color: 'var(--dispatch-text-primary)' }}>WorkerBadge</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <WorkerBadge id="worker-1234-abcd" mode="ws" capabilities={['book:crawl', 'book:update']} concurrency={4} lastSeen={new Date()} />
        <WorkerBadge id="worker-5678-efgh" mode="http" capabilities={['anime:crawl']} concurrency={2} lastSeen={new Date(Date.now() - 45000)} />
        <WorkerBadge id="worker-9012-ijkl" mode="ws" capabilities={['book:crawl']} concurrency={1} lastSeen={new Date(Date.now() - 120000)} />
      </div>

      <h2 style={{ color: 'var(--dispatch-text-primary)' }}>LogPanel</h2>
      <LogPanel entries={[
        { id: '1', timestamp: '12:00:01', severity: 'info', message: 'Worker connected' },
        { id: '2', timestamp: '12:00:05', severity: 'info', message: 'Task claimed: book:crawl' },
        { id: '3', timestamp: '12:00:10', severity: 'warn', message: 'Rate limit approaching' },
        { id: '4', timestamp: '12:00:15', severity: 'error', message: 'Failed to fetch: connection refused' },
        { id: '5', timestamp: '12:00:20', severity: 'info', message: 'Retrying task in 5s' },
      ]} />

      <h2 style={{ color: 'var(--dispatch-text-primary)', marginTop: 24 }}>QueueChart</h2>
      <QueueChart
        queueData={[
          { time: '12:00', pending: 10, running: 3 },
          { time: '12:05', pending: 8, running: 5 },
          { time: '12:10', pending: 12, running: 4 },
          { time: '12:15', pending: 6, running: 6 },
          { time: '12:20', pending: 3, running: 4 },
        ]}
        throughputData={[
          { time: '12:00', completed: 5 },
          { time: '12:05', completed: 8 },
          { time: '12:10', completed: 3 },
          { time: '12:15', completed: 10 },
          { time: '12:20', completed: 7 },
        ]}
      />

      <h2 style={{ color: 'var(--dispatch-text-primary)', marginTop: 24 }}>QueueChart (Empty)</h2>
      <QueueChart queueData={[]} emptyMessage="No data available" />
    </div>
  )
}

const root = document.getElementById('root')
if (root) createRoot(root).render(<App />)
