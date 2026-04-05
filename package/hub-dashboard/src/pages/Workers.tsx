import { useLL } from '../i18n'
import { useWorkers } from '../api/hooks'
import { WorkerBadge } from '@rezics/dispatch-ui'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

interface Worker {
  id: string
  project: string
  capabilities: string[]
  concurrency: number
  mode: string
  lastSeen: string
}

export function Workers() {
  const LL = useLL()
  const { data, isLoading } = useWorkers()

  const workers = (data ?? []) as unknown as Worker[]

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.hub.workers.title()}</h1>

      {isLoading && <div>{LL.common.labels.noData()}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {workers.map((w) => (
          <WorkerBadge
            key={w.id}
            id={w.id}
            mode={w.mode as 'ws' | 'http'}
            capabilities={w.capabilities}
            concurrency={w.concurrency}
            lastSeen={w.lastSeen}
            labels={{
              healthy: LL.hub.workers.healthy(),
              stale: LL.hub.workers.stale(),
              offline: LL.hub.workers.offline(),
              concurrency: LL.hub.workers.concurrency(),
            }}
          />
        ))}
        {!isLoading && workers.length === 0 && (
          <div style={{ color: 'var(--dispatch-text-muted)', padding: '24px', textAlign: 'center' }}>
            {LL.common.labels.noData()}
          </div>
        )}
      </div>
    </div>
  )
}
