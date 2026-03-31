import type { CSSProperties } from 'react'

export type LogSeverity = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  timestamp: string
  severity: LogSeverity
  message: string
}

export interface LogPanelProps {
  entries: LogEntry[]
  maxHeight?: number
}

const severityColors: Record<LogSeverity, string> = {
  info: 'var(--dispatch-severity-info)',
  warn: 'var(--dispatch-severity-warn)',
  error: 'var(--dispatch-severity-error)',
}

const containerStyle = (maxHeight: number): CSSProperties => ({
  fontFamily: 'var(--dispatch-font-mono)',
  fontSize: '12px',
  background: 'var(--dispatch-bg-secondary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  maxHeight: `${maxHeight}px`,
  overflowY: 'auto',
  color: 'var(--dispatch-text-primary)',
})

const entryStyle = (severity: LogSeverity): CSSProperties => ({
  padding: '4px 12px',
  borderBottom: '1px solid var(--dispatch-border)',
  display: 'flex',
  gap: '12px',
  alignItems: 'baseline',
  background: severity === 'error' ? 'rgba(220, 53, 69, 0.08)' : undefined,
})

export function LogPanel({ entries, maxHeight = 400 }: LogPanelProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div style={containerStyle(maxHeight)}>
      {sorted.map((entry) => (
        <div key={entry.id} style={entryStyle(entry.severity)}>
          <span style={{ color: 'var(--dispatch-text-muted)', whiteSpace: 'nowrap' }}>
            {entry.timestamp}
          </span>
          <span
            style={{
              color: severityColors[entry.severity],
              fontWeight: 600,
              textTransform: 'uppercase',
              minWidth: '40px',
            }}
          >
            {entry.severity}
          </span>
          <span style={{ color: entry.severity === 'error' ? severityColors.error : 'var(--dispatch-text-primary)' }}>
            {entry.message}
          </span>
        </div>
      ))}
    </div>
  )
}
