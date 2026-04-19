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
  healthy: 'var(--color-health-healthy)',
  stale: 'var(--color-health-stale)',
  offline: 'var(--color-health-offline)',
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
  const color = healthColor[health]

  return (
    <div className="flex items-center gap-3 border border-border bg-card px-4 py-3 text-card-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'size-2 shrink-0 rounded-full',
                health !== 'offline' && 'animate-signal-pulse',
              )}
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
          </TooltipTrigger>
          <TooltipContent className="font-mono text-[10.5px] uppercase tracking-[0.14em]">
            {healthLabel}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="font-mono text-sm font-semibold text-foreground">{id.slice(0, 10)}</span>
      <span
        className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {mode}
      </span>
      <div className="flex flex-wrap gap-1">
        {capabilities.map((cap) => (
          <span
            key={cap}
            className="border border-border/80 bg-background/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90"
          >
            {cap}
          </span>
        ))}
      </div>
      <span className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {labels.concurrency ?? 'Concurrency'} ×{concurrency}
      </span>
    </div>
  )
}
