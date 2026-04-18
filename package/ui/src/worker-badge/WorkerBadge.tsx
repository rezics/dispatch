import { Badge } from '@/shadcn/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shadcn/tooltip'
import { cn } from '@/lib/utils'

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

const healthColor: Record<HealthStatus, string> = {
  healthy: 'bg-[var(--color-health-healthy)]',
  stale: 'bg-[var(--color-health-stale)]',
  offline: 'bg-[var(--color-health-offline)]',
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
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-card-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('size-2.5 shrink-0 rounded-full', healthColor[health])} />
          </TooltipTrigger>
          <TooltipContent>{healthLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="font-mono text-sm font-semibold">{id.slice(0, 8)}</span>
      <Badge variant="secondary" className="uppercase">
        {mode}
      </Badge>
      <div className="flex flex-wrap gap-1">
        {capabilities.map((cap) => (
          <Badge key={cap} variant="outline" className="text-xs font-normal">
            {cap}
          </Badge>
        ))}
      </div>
      <span className="ml-auto text-xs text-muted-foreground">
        {labels.concurrency ?? 'Concurrency'}: {concurrency}
      </span>
    </div>
  )
}
