import { useLL } from '../i18n'
import { useWorkerStatus } from '../api/hooks'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

const cardGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
}

const cardStyle: CSSProperties = {
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '16px',
  boxShadow: 'var(--dispatch-shadow)',
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

interface StatusData {
  hubUrl: string
  mode: string
  connectionState: string
  uptime: number
  activeTasks: number
  completedTasks: number
  failedTasks: number
}

export function Status() {
  const LL = useLL()
  const { data, isLoading } = useWorkerStatus()

  const status = data as StatusData | undefined

  const stateColors: Record<string, string> = {
    connected: 'var(--dispatch-health-healthy)',
    disconnected: 'var(--dispatch-health-offline)',
    reconnecting: 'var(--dispatch-health-stale)',
  }

  const stateLabels: Record<string, () => string> = {
    connected: LL.worker.status.connected,
    disconnected: LL.worker.status.disconnected,
    reconnecting: LL.worker.status.reconnecting,
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.worker.status.title()}</h1>

      {isLoading && <div>Loading...</div>}

      {status && (
        <>
          <div style={cardGrid}>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.hubUrl()}</div>
              <div style={{ fontSize: '14px', fontFamily: 'var(--dispatch-font-mono)', marginTop: '4px' }}>{status.hubUrl}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.connectionMode()}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>{status.mode}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.title()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stateColors[status.connectionState] ?? 'gray' }} />
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  {stateLabels[status.connectionState]?.() ?? status.connectionState}
                </span>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.uptime()}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{formatUptime(status.uptime)}</div>
            </div>
          </div>

          <div style={cardGrid}>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.activeTasks()}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-running)' }}>{status.activeTasks}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.completedTasks()}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-done)' }}>{status.completedTasks}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.status.failedTasks()}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-failed)' }}>{status.failedTasks}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
