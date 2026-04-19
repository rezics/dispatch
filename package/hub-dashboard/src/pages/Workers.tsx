import { useLL } from '../i18n'
import { useWorkers } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'
import { Radio, Wifi, WifiOff } from 'lucide-react'

interface Worker {
  id: string
  project: string
  capabilities: string[]
  concurrency: number
  mode: string
  lastSeen: string
}

type Health = 'healthy' | 'stale' | 'offline'

function workerHealth(lastSeen: string | Date): Health {
  const elapsed = (Date.now() - new Date(lastSeen).getTime()) / 1000
  if (elapsed <= 30) return 'healthy'
  if (elapsed <= 60) return 'stale'
  return 'offline'
}

function relative(when: string | Date): string {
  const elapsed = (Date.now() - new Date(when).getTime()) / 1000
  if (elapsed < 1) return 'just now'
  if (elapsed < 60) return `${Math.floor(elapsed)}s ago`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`
  return `${Math.floor(elapsed / 86400)}d ago`
}

const healthMeta: Record<Health, { color: string; label: string }> = {
  healthy: { color: 'var(--color-health-healthy)', label: 'ONLINE' },
  stale: { color: 'var(--color-health-stale)', label: 'STALE' },
  offline: { color: 'var(--color-health-offline)', label: 'OFFLINE' },
}

function WorkerBlade({ worker, delay }: { worker: Worker; delay: number }) {
  const h = workerHealth(worker.lastSeen)
  const meta = healthMeta[h]
  return (
    <div
      className={cn(
        'reveal group relative border border-border bg-card/70 p-6 corner-ticks transition-all',
        'hover:border-foreground/30 hover:bg-card',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn('size-2.5 rounded-full', h !== 'offline' && 'animate-signal-pulse')}
            style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
            aria-hidden
          />
          <div>
            <div className="font-mono text-[13px] font-medium text-foreground">
              {worker.id.slice(0, 14)}
            </div>
            <div className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">
              PROJECT · {worker.project || 'default'}
            </div>
          </div>
        </div>
        <span
          className="border px-2 py-0.5 font-mono text-[10px] tracking-wider-caps"
          style={{
            color: meta.color,
            borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-border/70 pt-5">
        <div>
          <div className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">
            mode
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-foreground">
            {worker.mode === 'ws' ? (
              <Radio className="size-3 text-signal-cyan" style={{ color: 'var(--color-signal-cyan)' }} />
            ) : (
              <Wifi className="size-3 text-signal-phosphor" style={{ color: 'var(--color-signal-phosphor)' }} />
            )}
            <span className="uppercase">{worker.mode}</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">
            concurrency
          </div>
          <div className="mt-1 font-mono text-xs text-foreground numeric-tabular">
            ×{worker.concurrency}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">
            last seen
          </div>
          <div className="mt-1 font-mono text-xs text-foreground">
            {relative(worker.lastSeen)}
          </div>
        </div>
      </div>

      {worker.capabilities.length > 0 && (
        <div className="mt-5 border-t border-border/70 pt-4">
          <div className="mb-1.5 font-mono text-[10px] tracking-wider-caps text-muted-foreground">
            capabilities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {worker.capabilities.map((cap) => (
              <span
                key={cap}
                className="border border-border/80 bg-background/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Workers() {
  const LL = useLL()
  const { data, isLoading } = useWorkers()

  const workers = (data ?? []) as unknown as Worker[]

  const counts = workers.reduce(
    (acc, w) => {
      acc[workerHealth(w.lastSeen)]++
      return acc
    },
    { healthy: 0, stale: 0, offline: 0 } as Record<Health, number>,
  )

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="SECTOR 02 · FLEET"
        title={LL.hub.workers.title()}
        index="// 02"
        description="Distributed execution units. Each blade reports heartbeat, capabilities, and concurrency."
        actions={
          <div className="flex items-center gap-4 border border-border bg-card/60 px-4 py-1.5 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: 'var(--color-health-healthy)' }} />
              <span className="text-muted-foreground">healthy</span>
              <span className="numeric-tabular text-foreground">{counts.healthy}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: 'var(--color-health-stale)' }} />
              <span className="text-muted-foreground">stale</span>
              <span className="numeric-tabular text-foreground">{counts.stale}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <WifiOff className="size-3 text-muted-foreground" />
              <span className="text-muted-foreground">offline</span>
              <span className="numeric-tabular text-foreground">{counts.offline}</span>
            </span>
          </div>
        }
      />

      {workers.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((w, i) => (
            <WorkerBlade key={w.id} worker={w} delay={i * 45} />
          ))}
        </div>
      ) : (
        <SectionCard label="// FLEET" title="No active units">
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-dashed border-border">
              <WifiOff className="size-5 text-muted-foreground" />
            </div>
            <p className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
              {isLoading ? 'scanning fleet…' : LL.common.labels.noData()}
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
