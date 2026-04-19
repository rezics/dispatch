import { useLL } from '../i18n'
import { useStats, useWorkers } from '../api/hooks'
import { QueueChart } from '@rezics/dispatch-ui'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { StatReadout } from '../components/StatReadout'
import { MoveUpRight, Activity } from 'lucide-react'

interface Worker {
  id: string
  mode: string
  lastSeen: string
  capabilities: string[]
  concurrency: number
}

function workerHealth(lastSeen: string | Date): 'healthy' | 'stale' | 'offline' {
  const elapsed = (Date.now() - new Date(lastSeen).getTime()) / 1000
  if (elapsed <= 30) return 'healthy'
  if (elapsed <= 60) return 'stale'
  return 'offline'
}

export function Overview() {
  const LL = useLL()
  const stats = useStats('default')
  const workers = useWorkers()

  const statusData = stats.data as
    | { pending?: number; running?: number; done?: number; failed?: number }
    | undefined

  const workerList = (workers.data ?? []) as unknown as Worker[]
  const healthy = workerList.filter((w) => workerHealth(w.lastSeen) === 'healthy').length
  const stale = workerList.filter((w) => workerHealth(w.lastSeen) === 'stale').length
  const offline = workerList.filter((w) => workerHealth(w.lastSeen) === 'offline').length

  const total =
    (statusData?.pending ?? 0) +
    (statusData?.running ?? 0) +
    (statusData?.done ?? 0) +
    (statusData?.failed ?? 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SECTOR 01 · LIVE TELEMETRY"
        title={LL.hub.overview.title()}
        index="// 01"
        description="Realtime operator view across all dispatch sectors. Signals refresh every five seconds."
        actions={
          <div className="flex items-center gap-2 border border-border bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
            <Activity className="size-3.5 text-signal-phosphor" style={{ color: 'var(--color-signal-phosphor)' }} />
            <span>
              <span className="numeric-tabular text-foreground">{total}</span> total transactions
            </span>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatReadout
          label={LL.common.status.pending()}
          value={statusData?.pending ?? '—'}
          accent="amber"
          code="STA.01"
          pulse={(statusData?.pending ?? 0) > 0}
          delay={0}
        />
        <StatReadout
          label={LL.common.status.running()}
          value={statusData?.running ?? '—'}
          accent="cyan"
          code="STA.02"
          pulse={(statusData?.running ?? 0) > 0}
          delay={60}
        />
        <StatReadout
          label={LL.common.status.done()}
          value={statusData?.done ?? '—'}
          accent="phosphor"
          code="STA.03"
          delay={120}
        />
        <StatReadout
          label={LL.common.status.failed()}
          value={statusData?.failed ?? '—'}
          accent="crimson"
          code="STA.04"
          pulse={(statusData?.failed ?? 0) > 0}
          delay={180}
        />
        <StatReadout
          label={LL.hub.workers.title()}
          value={workerList.length || '—'}
          accent="violet"
          code="UNITS"
          suffix={
            <span>
              <span style={{ color: 'var(--color-health-healthy)' }}>●</span>{' '}
              {healthy} healthy · {stale + offline} offline
            </span>
          }
          delay={240}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SectionCard
          label="// QUEUE DEPTH"
          title={LL.hub.overview.queueDepth()}
          meta="live · 5s"
        >
          <div className="p-5">
            <QueueChart
              queueData={[]}
              emptyMessage={LL.common.labels.noData()}
              labels={{
                pending: LL.common.status.pending(),
                running: LL.common.status.running(),
              }}
            />
          </div>
        </SectionCard>

        <SectionCard label="// FLEET STATUS" title={LL.hub.workers.title()}>
          <ul className="divide-y divide-border/60">
            {workerList.length === 0 && (
              <li className="px-5 py-8 text-center font-mono text-[11px] text-muted-foreground">
                {LL.common.labels.noData()}
              </li>
            )}
            {workerList.slice(0, 6).map((w) => {
              const h = workerHealth(w.lastSeen)
              const color =
                h === 'healthy'
                  ? 'var(--color-health-healthy)'
                  : h === 'stale'
                  ? 'var(--color-health-stale)'
                  : 'var(--color-health-offline)'
              return (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="font-mono text-[11.5px] text-foreground/90">
                    {w.id.slice(0, 10)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider-caps text-muted-foreground">
                    ×{w.concurrency} · {w.mode}
                  </span>
                </li>
              )
            })}
          </ul>
          {workerList.length > 6 && (
            <div className="border-t border-border/70 px-5 py-3 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
              + {workerList.length - 6} more units
              <MoveUpRight className="ml-1 inline size-3" />
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
