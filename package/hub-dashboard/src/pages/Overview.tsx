import { useLL } from '../i18n'
import { useStats, useWorkers } from '../api/hooks'
import { QueueChart } from '@rezics/dispatch-ui'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

const cardGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
}

const statCard: CSSProperties = {
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '16px',
  boxShadow: 'var(--dispatch-shadow)',
}

export function Overview() {
  const LL = useLL()
  const stats = useStats('default')
  const workers = useWorkers()

  const statusData = stats.data as { pending?: number; running?: number; done?: number; failed?: number } | undefined

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.hub.overview.title()}</h1>

      <div style={cardGrid}>
        <div style={statCard}>
          <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.common.status.pending()}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-pending)' }}>
            {statusData?.pending ?? '-'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.common.status.running()}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-running)' }}>
            {statusData?.running ?? '-'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.common.status.done()}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-done)' }}>
            {statusData?.done ?? '-'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.common.status.failed()}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--dispatch-status-failed)' }}>
            {statusData?.failed ?? '-'}
          </div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.hub.workers.title()}</div>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>
            {workers.data ? (workers.data as unknown[]).length : '-'}
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '12px' }}>{LL.hub.overview.queueDepth()}</h2>
      <QueueChart
        queueData={[]}
        emptyMessage={LL.common.labels.noData()}
        labels={{
          pending: LL.common.status.pending(),
          running: LL.common.status.running(),
        }}
      />
    </div>
  )
}
