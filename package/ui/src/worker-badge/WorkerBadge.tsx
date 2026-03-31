import type { CSSProperties } from 'react'

export interface WorkerBadgeProps {
  id: string
  mode: 'ws' | 'http'
  capabilities: string[]
  concurrency: number
  lastSeen: Date | string
  labels?: {
    healthy?: string
    stale?: string
    offline?: string
    concurrency?: string
  }
}

type HealthStatus = 'healthy' | 'stale' | 'offline'

function getHealthStatus(lastSeen: Date | string): HealthStatus {
  const now = Date.now()
  const seen = new Date(lastSeen).getTime()
  const elapsed = (now - seen) / 1000
  if (elapsed <= 30) return 'healthy'
  if (elapsed <= 60) return 'stale'
  return 'offline'
}

const healthColors: Record<HealthStatus, string> = {
  healthy: 'var(--dispatch-health-healthy)',
  stale: 'var(--dispatch-health-stale)',
  offline: 'var(--dispatch-health-offline)',
}

const containerStyle: CSSProperties = {
  fontFamily: 'var(--dispatch-font-family)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 12px',
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  color: 'var(--dispatch-text-primary)',
}

const tagStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  background: 'var(--dispatch-bg-tertiary)',
  color: 'var(--dispatch-text-secondary)',
}

const modeTagStyle: CSSProperties = {
  ...tagStyle,
  fontWeight: 600,
  textTransform: 'uppercase',
}

export function WorkerBadge({
  id,
  mode,
  capabilities,
  concurrency,
  lastSeen,
  labels = {},
}: WorkerBadgeProps) {
  const health = getHealthStatus(lastSeen)
  const healthLabel = labels[health] ?? health

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: healthColors[health],
          flexShrink: 0,
        }}
        title={healthLabel}
      />
      <span style={{ fontWeight: 600, fontFamily: 'var(--dispatch-font-mono)', fontSize: '13px' }}>
        {id.slice(0, 8)}
      </span>
      <span style={modeTagStyle}>{mode}</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {capabilities.map((cap) => (
          <span key={cap} style={tagStyle}>{cap}</span>
        ))}
      </div>
      <span style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginLeft: 'auto' }}>
        {labels.concurrency ?? 'Concurrency'}: {concurrency}
      </span>
    </div>
  )
}
