import { useState } from 'react'
import { useLL } from '../i18n'
import { useTasks } from '../api/hooks'
import type { TaskStatus } from '@rezics/dispatch-type'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rezics/dispatch-ui/shadcn/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rezics/dispatch-ui/shadcn/dialog'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { StatusPill } from '../components/StatusPill'
import { cn } from '../lib/cn'
import { ArrowLeft, ArrowRight, ChevronRight, Search, X } from 'lucide-react'

const PAGE_SIZE = 50

interface TaskData {
  id: string
  type: string
  status: TaskStatus
  priority: number
  progress?: { percent: number; message?: string }
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  workerId?: string | null
  error?: string | null
  payload?: unknown
}

function ProgressBar({ percent }: { percent: number }) {
  const pct = Math.max(0, Math.min(100, percent))
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 flex-1 overflow-hidden border border-border bg-background/60">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--color-signal-amber)',
            boxShadow: `0 0 8px var(--color-signal-amber)`,
          }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-[10.5px] text-muted-foreground numeric-tabular">
        {pct}%
      </span>
    </div>
  )
}

function formatTime(raw: unknown): string {
  if (!raw) return '—'
  try {
    const d = new Date(String(raw))
    if (isNaN(d.getTime())) return String(raw)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  } catch {
    return String(raw)
  }
}

export function Tasks() {
  const LL = useLL()
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null)

  const { data, isLoading } = useTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const tasks = (data ?? []) as unknown as TaskData[]
  const statusLabel = (status: TaskStatus) => LL.common.status[status]()
  const hasFilters = statusFilter !== 'all' || typeFilter

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SECTOR 03 · TRANSACTIONS"
        title={LL.hub.tasks.title()}
        index="// 03"
        description="Inbound and processed task transactions across all projects."
      />

      {/* Filter console */}
      <SectionCard label="// FILTER BUS" title="Query" contentClassName="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
              status
            </span>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={LL.hub.tasks.filterByStatus()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">{LL.common.status.pending()}</SelectItem>
                <SelectItem value="running">{LL.common.status.running()}</SelectItem>
                <SelectItem value="done">{LL.common.status.done()}</SelectItem>
                <SelectItem value="failed">{LL.common.status.failed()}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
              type
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={LL.hub.tasks.filterByType()}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(0)
                }}
                className="w-56 pl-8 font-mono text-xs"
              />
            </div>
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('')
                setPage(0)
              }}
              className="gap-1.5"
            >
              <X className="size-3" />
              <span className="font-mono text-[11px] tracking-wider-caps">clear</span>
            </Button>
          )}
          <div className="ml-auto font-mono text-[11px] text-muted-foreground">
            <span className="numeric-tabular text-foreground">{tasks.length}</span> result
            {tasks.length === 1 ? '' : 's'} · page{' '}
            <span className="numeric-tabular text-foreground">{page + 1}</span>
          </div>
        </div>
      </SectionCard>

      {/* Task ledger */}
      <SectionCard label="// TASK LEDGER" meta={isLoading ? 'syncing…' : 'live'}>
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-border bg-background/40">
              <tr className="text-left font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Pri.</th>
                <th className="w-64 px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Worker</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    'group cursor-pointer border-b border-border/60 transition-colors',
                    'hover:bg-accent/40',
                  )}
                  style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
                >
                  <td className="w-10 px-4 py-3 text-muted-foreground">
                    <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--color-signal-amber)' }} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-foreground/90 numeric-tabular">
                    {task.id.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {task.type}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={task.status} label={statusLabel(task.status)} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs numeric-tabular">
                    {task.priority}
                  </td>
                  <td className="px-4 py-3">
                    {task.progress ? (
                      <div className="flex flex-col gap-1">
                        <ProgressBar percent={task.progress.percent} />
                        {task.progress.message && (
                          <span className="font-mono text-[10.5px] text-muted-foreground truncate">
                            {task.progress.message}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground numeric-tabular">
                    {formatTime(task.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11.5px] text-foreground/80">
                    {task.workerId ? (
                      task.workerId.slice(0, 10)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && tasks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
                      {LL.hub.tasks.noTasks()}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {tasks.length === PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="gap-1.5 font-mono text-[11px] tracking-wider-caps"
          >
            <ArrowLeft className="size-3" />
            prev
          </Button>
          <span className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
            page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            className="gap-1.5 font-mono text-[11px] tracking-wider-caps"
          >
            next
            <ArrowRight className="size-3" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-3xl border-border bg-card p-0 corner-ticks">
          {selectedTask && (
            <div className="divide-y divide-border/60">
              <DialogHeader className="space-y-2 px-6 pb-4 pt-6">
                <div className="font-mono text-[10.5px] tracking-wider-caps text-signal-amber"
                  style={{ color: 'var(--color-signal-amber)' }}>
                  // TASK DOSSIER
                </div>
                <DialogTitle className="flex items-center gap-3 font-mono text-base">
                  <span className="text-foreground">{selectedTask.id.slice(0, 14)}</span>
                  <StatusPill status={selectedTask.status} label={statusLabel(selectedTask.status)} />
                </DialogTitle>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {selectedTask.type} · priority{' '}
                  <span className="text-foreground numeric-tabular">{selectedTask.priority}</span>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 text-sm">
                <Row k={LL.common.labels.id()} v={<span className="font-mono">{selectedTask.id}</span>} span />
                <Row k={LL.common.labels.type()} v={selectedTask.type} />
                <Row k={LL.common.labels.priority()} v={<span className="font-mono numeric-tabular">{selectedTask.priority}</span>} />
                <Row k={LL.common.labels.created()} v={<span className="font-mono numeric-tabular">{formatTime(selectedTask.createdAt)}</span>} />
                {selectedTask.startedAt && (
                  <Row k={LL.common.labels.started()} v={<span className="font-mono numeric-tabular">{formatTime(selectedTask.startedAt)}</span>} />
                )}
                {selectedTask.finishedAt && (
                  <Row k={LL.common.labels.finished()} v={<span className="font-mono numeric-tabular">{formatTime(selectedTask.finishedAt)}</span>} />
                )}
                {selectedTask.workerId && (
                  <Row k={LL.common.labels.worker()} v={<span className="font-mono">{selectedTask.workerId}</span>} />
                )}
                {selectedTask.progress && (
                  <Row
                    k={LL.common.labels.progress()}
                    span
                    v={
                      <div className="space-y-1">
                        <ProgressBar percent={selectedTask.progress.percent} />
                        {selectedTask.progress.message && (
                          <span className="font-mono text-[10.5px] text-muted-foreground">
                            {selectedTask.progress.message}
                          </span>
                        )}
                      </div>
                    }
                  />
                )}
              </div>

              {selectedTask.error && (
                <div className="space-y-2 px-6 py-4">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-wider-caps"
                    style={{ color: 'var(--color-status-failed)' }}>
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: 'var(--color-status-failed)' }} />
                    {LL.hub.tasks.error()}
                  </div>
                  <pre className="overflow-auto border border-destructive/30 bg-destructive/5 p-3 font-mono text-[11px] leading-relaxed text-destructive whitespace-pre-wrap">
                    {selectedTask.error}
                  </pre>
                </div>
              )}

              <div className="space-y-2 px-6 py-4">
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: 'var(--color-signal-cyan)' }} />
                  {LL.hub.tasks.payload()}
                </div>
                <pre className="max-h-96 overflow-auto border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(selectedTask.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ k, v, span }: { k: string; v: React.ReactNode; span?: boolean }) {
  return (
    <div className={cn('space-y-1', span && 'col-span-2')}>
      <div className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">{k}</div>
      <div className="text-sm text-foreground">{v}</div>
    </div>
  )
}
