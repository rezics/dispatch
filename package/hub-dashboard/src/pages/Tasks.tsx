import { useState } from 'react'
import { useLL } from '../i18n'
import { useTasks } from '../api/hooks'
import type { TaskStatus } from '@rezics/dispatch-type'
import { Badge } from '@rezics/dispatch-ui/shadcn/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rezics/dispatch-ui/shadcn/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rezics/dispatch-ui/shadcn/dialog'
import { Card, CardContent } from '@rezics/dispatch-ui/shadcn/card'
import { Progress } from '@rezics/dispatch-ui/shadcn/progress'

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

const statusTone: Record<TaskStatus, string> = {
  pending: 'bg-[var(--color-status-pending)] text-black',
  running: 'bg-[var(--color-status-running)] text-white',
  done: 'bg-[var(--color-status-done)] text-white',
  failed: 'bg-[var(--color-status-failed)] text-white',
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{LL.hub.tasks.title()}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={LL.hub.tasks.filterByStatus()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{LL.hub.tasks.filterByStatus()}</SelectItem>
            <SelectItem value="pending">{LL.common.status.pending()}</SelectItem>
            <SelectItem value="running">{LL.common.status.running()}</SelectItem>
            <SelectItem value="done">{LL.common.status.done()}</SelectItem>
            <SelectItem value="failed">{LL.common.status.failed()}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={LL.hub.tasks.filterByType()}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(0)
          }}
          className="w-48"
        />
        {(statusFilter !== 'all' || typeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all')
              setTypeFilter('')
              setPage(0)
            }}
          >
            {LL.common.actions.clear()}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{LL.common.labels.id()}</TableHead>
                <TableHead>{LL.common.labels.type()}</TableHead>
                <TableHead>{LL.common.labels.status()}</TableHead>
                <TableHead className="text-right">{LL.common.labels.priority()}</TableHead>
                <TableHead className="w-48">{LL.common.labels.progress()}</TableHead>
                <TableHead>{LL.common.labels.created()}</TableHead>
                <TableHead>{LL.common.labels.worker()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-xs">{task.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{task.type}</TableCell>
                  <TableCell>
                    <Badge className={statusTone[task.status]}>{statusLabel(task.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{task.priority}</TableCell>
                  <TableCell>
                    {task.progress ? (
                      <div className="flex flex-col gap-1">
                        <Progress value={task.progress.percent} className="h-2" />
                        {task.progress.message && (
                          <span className="text-xs text-muted-foreground">
                            {task.progress.message} ({task.progress.percent}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {String(task.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {task.workerId ? task.workerId.slice(0, 8) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {LL.hub.tasks.noTasks()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {tasks.length === PAGE_SIZE && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="px-3 py-1 text-sm text-muted-foreground">
            {LL.hub.tasks.page({ current: page + 1, total: page + 2 })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{LL.hub.tasks.detail()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>{LL.common.labels.id()}:</strong>{' '}
                  <span className="font-mono">{selectedTask.id}</span>
                </div>
                <div>
                  <strong>{LL.common.labels.type()}:</strong> {selectedTask.type}
                </div>
                <div>
                  <strong>{LL.common.labels.status()}:</strong> {statusLabel(selectedTask.status)}
                </div>
                <div>
                  <strong>{LL.common.labels.priority()}:</strong> {selectedTask.priority}
                </div>
                <div>
                  <strong>{LL.common.labels.created()}:</strong> {String(selectedTask.createdAt)}
                </div>
                {selectedTask.startedAt && (
                  <div>
                    <strong>{LL.common.labels.started()}:</strong>{' '}
                    {String(selectedTask.startedAt)}
                  </div>
                )}
                {selectedTask.finishedAt && (
                  <div>
                    <strong>{LL.common.labels.finished()}:</strong>{' '}
                    {String(selectedTask.finishedAt)}
                  </div>
                )}
                {selectedTask.workerId && (
                  <div>
                    <strong>{LL.common.labels.worker()}:</strong>{' '}
                    <span className="font-mono">{selectedTask.workerId}</span>
                  </div>
                )}
                {selectedTask.progress && (
                  <div>
                    <strong>{LL.common.labels.progress()}:</strong>{' '}
                    {selectedTask.progress.percent}%
                    {selectedTask.progress.message && ` — ${selectedTask.progress.message}`}
                  </div>
                )}
                {selectedTask.error && (
                  <div className="space-y-1">
                    <strong>{LL.hub.tasks.error()}:</strong>
                    <pre className="rounded-md bg-destructive/10 p-2 font-mono text-xs whitespace-pre-wrap">
                      {selectedTask.error}
                    </pre>
                  </div>
                )}
                <div className="space-y-1">
                  <strong>{LL.hub.tasks.payload()}:</strong>
                  <pre className="max-h-96 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
                    {JSON.stringify(selectedTask.payload, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
