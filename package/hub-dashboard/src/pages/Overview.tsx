import { useLL } from '../i18n'
import { useStats, useWorkers } from '../api/hooks'
import { QueueChart } from '@rezics/dispatch-ui'
import { Card, CardContent, CardHeader, CardTitle } from '@rezics/dispatch-ui/shadcn/card'

interface StatCardProps {
  label: string
  value: string | number
  accent?: string
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-3xl font-bold" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

export function Overview() {
  const LL = useLL()
  const stats = useStats('default')
  const workers = useWorkers()

  const statusData = stats.data as
    | { pending?: number; running?: number; done?: number; failed?: number }
    | undefined

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{LL.hub.overview.title()}</h1>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <StatCard
          label={LL.common.status.pending()}
          value={statusData?.pending ?? '-'}
          accent="var(--color-status-pending)"
        />
        <StatCard
          label={LL.common.status.running()}
          value={statusData?.running ?? '-'}
          accent="var(--color-status-running)"
        />
        <StatCard
          label={LL.common.status.done()}
          value={statusData?.done ?? '-'}
          accent="var(--color-status-done)"
        />
        <StatCard
          label={LL.common.status.failed()}
          value={statusData?.failed ?? '-'}
          accent="var(--color-status-failed)"
        />
        <StatCard
          label={LL.hub.workers.title()}
          value={workers.data ? (workers.data as unknown[]).length : '-'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{LL.hub.overview.queueDepth()}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueChart
            queueData={[]}
            emptyMessage={LL.common.labels.noData()}
            labels={{
              pending: LL.common.status.pending(),
              running: LL.common.status.running(),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
