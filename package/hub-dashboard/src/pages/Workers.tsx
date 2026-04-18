import { useLL } from '../i18n'
import { useWorkers } from '../api/hooks'
import { WorkerBadge } from '@rezics/dispatch-ui'
import { Card, CardContent } from '@rezics/dispatch-ui/shadcn/card'

interface Worker {
  id: string
  project: string
  capabilities: string[]
  concurrency: number
  mode: string
  lastSeen: string
}

export function Workers() {
  const LL = useLL()
  const { data, isLoading } = useWorkers()

  const workers = (data ?? []) as unknown as Worker[]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{LL.hub.workers.title()}</h1>

      {isLoading && <div className="text-muted-foreground">{LL.common.labels.noData()}</div>}

      <div className="flex flex-col gap-2">
        {workers.map((w) => (
          <WorkerBadge
            key={w.id}
            id={w.id}
            mode={w.mode as 'ws' | 'http'}
            capabilities={w.capabilities}
            concurrency={w.concurrency}
            lastSeen={w.lastSeen}
            labels={{
              healthy: LL.hub.workers.healthy(),
              stale: LL.hub.workers.stale(),
              offline: LL.hub.workers.offline(),
              concurrency: LL.hub.workers.concurrency(),
            }}
          />
        ))}
        {!isLoading && workers.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {LL.common.labels.noData()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
