import type { TaskStatus } from '@rezics/dispatch-type'
import { Card, CardContent } from '@/shadcn/card'
import { Badge } from '@/shadcn/badge'
import { Progress } from '@/shadcn/progress'
import { cn } from '@/lib/utils'

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

const statusTone: Record<TaskStatus, string> = {
  pending: 'bg-[var(--color-status-pending)] text-black',
  running: 'bg-[var(--color-status-running)] text-white',
  done: 'bg-[var(--color-status-done)] text-white',
  failed: 'bg-[var(--color-status-failed)] text-white',
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
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn('cursor-pointer transition-colors hover:bg-accent/40')}
    >
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold">{type}</span>
            <span className="text-xs font-mono text-muted-foreground">{id.slice(0, 8)}</span>
          </div>
          <Badge className={statusTone[status]}>{statusLabel}</Badge>
        </div>

        {progress && (
          <div className="space-y-1">
            <Progress value={Math.min(100, Math.max(0, progress.percent))} className="h-2" />
            {progress.message && (
              <p className="text-xs text-muted-foreground">
                {progress.message} ({progress.percent}%)
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 px-2 py-1.5 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            {labels.priority ?? 'Priority'}: {priority}
          </span>
          <span>
            {labels.created ?? 'Created'}: {createdAt}
          </span>
          {startedAt && (
            <span>
              {labels.started ?? 'Started'}: {startedAt}
            </span>
          )}
          {finishedAt && (
            <span>
              {labels.finished ?? 'Finished'}: {finishedAt}
            </span>
          )}
          {workerId && (
            <span>
              {labels.worker ?? 'Worker'}: {workerId.slice(0, 8)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
