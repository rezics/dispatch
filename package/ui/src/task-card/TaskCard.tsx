import type { TaskStatus } from '@rezics/dispatch-type'
import type { CSSProperties } from 'react'

export interface TaskCardProps {
  id: string
  type: string
  status: TaskStatus
  statusLabel: string
  priority: number
  progress?: { percent: number; message?: string }
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  workerId?: string | null
  error?: string | null
  onClick?: () => void
  labels?: {
    id?: string
    type?: string
    priority?: string
    progress?: string
    created?: string
    started?: string
    finished?: string
    worker?: string
  }
}

const statusColors: Record<TaskStatus, string> = {
  pending: 'var(--dispatch-status-pending)',
  running: 'var(--dispatch-status-running)',
  done: 'var(--dispatch-status-done)',
  failed: 'var(--dispatch-status-failed)',
}

const cardStyle: CSSProperties = {
  fontFamily: 'var(--dispatch-font-family)',
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '12px 16px',
  boxShadow: 'var(--dispatch-shadow)',
  cursor: 'pointer',
  color: 'var(--dispatch-text-primary)',
}

const badgeStyle = (status: TaskStatus): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#fff',
  background: statusColors[status],
})

const progressBarContainer: CSSProperties = {
  background: 'var(--dispatch-progress-bg)',
  borderRadius: '4px',
  height: '8px',
  marginTop: '8px',
  overflow: 'hidden',
}

const metaStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--dispatch-text-secondary)',
  marginTop: '8px',
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
}

export function TaskCard({
  id,
  type,
  status,
  statusLabel,
  priority,
  progress,
  createdAt,
  startedAt,
  finishedAt,
  workerId,
  error,
  onClick,
  labels = {},
}: TaskCardProps) {
  return (
    <div style={cardStyle} onClick={onClick} role="button" tabIndex={0}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 600 }}>{type}</span>
          <span style={{ color: 'var(--dispatch-text-muted)', marginLeft: '8px', fontSize: '12px' }}>
            {id.slice(0, 8)}
          </span>
        </div>
        <span style={badgeStyle(status)}>{statusLabel}</span>
      </div>

      {progress && (
        <div>
          <div style={progressBarContainer}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                height: '100%',
                background: 'var(--dispatch-progress-fill)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          {progress.message && (
            <div style={{ fontSize: '11px', color: 'var(--dispatch-text-secondary)', marginTop: '4px' }}>
              {progress.message} ({progress.percent}%)
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 8px',
            background: 'rgba(220, 53, 69, 0.1)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--dispatch-status-failed)',
            fontFamily: 'var(--dispatch-font-mono)',
          }}
        >
          {error}
        </div>
      )}

      <div style={metaStyle}>
        <span>{labels.priority ?? 'Priority'}: {priority}</span>
        <span>{labels.created ?? 'Created'}: {createdAt}</span>
        {startedAt && <span>{labels.started ?? 'Started'}: {startedAt}</span>}
        {finishedAt && <span>{labels.finished ?? 'Finished'}: {finishedAt}</span>}
        {workerId && <span>{labels.worker ?? 'Worker'}: {workerId.slice(0, 8)}</span>}
      </div>
    </div>
  )
}
