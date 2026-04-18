import { ScrollArea } from '@/shadcn/scroll-area'
import { cn } from '@/lib/utils'

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

const severityTextColor: Record<LogSeverity, string> = {
  info: 'text-[var(--color-severity-info)]',
  warn: 'text-[var(--color-severity-warn)]',
  error: 'text-[var(--color-severity-error)]',
}

export function LogPanel({ entries, maxHeight = 400 }: LogPanelProps) {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <ScrollArea
      className="rounded-lg border bg-muted/40 font-mono text-xs"
      style={{ maxHeight }}
    >
      <div>
        {sorted.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              'flex items-baseline gap-3 border-b px-3 py-1',
              entry.severity === 'error' && 'bg-destructive/10',
            )}
          >
            <span className="whitespace-nowrap text-muted-foreground">{entry.timestamp}</span>
            <span
              className={cn(
                'min-w-10 font-semibold uppercase',
                severityTextColor[entry.severity],
              )}
            >
              {entry.severity}
            </span>
            <span
              className={cn(
                entry.severity === 'error' && severityTextColor.error,
              )}
            >
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
