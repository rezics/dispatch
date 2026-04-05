import { useState } from 'react'
import { useLL } from '../i18n'
import { useTasks } from '../api/hooks'
import { TaskCard } from '@rezics/dispatch-ui'
import type { TaskStatus } from '@rezics/dispatch-type'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

const filterBar: CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
  flexWrap: 'wrap',
}

const filterInput: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  background: 'var(--dispatch-bg-primary)',
  color: 'var(--dispatch-text-primary)',
  fontFamily: 'var(--dispatch-font-family)',
  fontSize: '13px',
}

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

export function Tasks() {
  const LL = useLL()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null)

  const { data, isLoading } = useTasks({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const tasks = (data ?? []) as unknown as TaskData[]

  const statusLabel = (status: TaskStatus) => LL.common.status[status]()

  if (selectedTask) {
    return (
      <div style={pageStyle}>
        <button
          onClick={() => setSelectedTask(null)}
          style={{ ...filterInput, cursor: 'pointer', marginBottom: '16px' }}
        >
          Back
        </button>
        <h1 style={{ marginBottom: '16px' }}>{LL.hub.tasks.detail()}</h1>
        <div style={{ background: 'var(--dispatch-bg-secondary)', border: '1px solid var(--dispatch-border)', borderRadius: 'var(--dispatch-radius)', padding: '16px' }}>
          <div><strong>{LL.common.labels.id()}:</strong> {selectedTask.id}</div>
          <div><strong>{LL.common.labels.type()}:</strong> {selectedTask.type}</div>
          <div><strong>{LL.common.labels.status()}:</strong> {statusLabel(selectedTask.status)}</div>
          <div><strong>{LL.common.labels.priority()}:</strong> {selectedTask.priority}</div>
          <div><strong>{LL.common.labels.created()}:</strong> {String(selectedTask.createdAt)}</div>
          {selectedTask.startedAt && <div><strong>{LL.common.labels.started()}:</strong> {String(selectedTask.startedAt)}</div>}
          {selectedTask.finishedAt && <div><strong>{LL.common.labels.finished()}:</strong> {String(selectedTask.finishedAt)}</div>}
          {selectedTask.workerId && <div><strong>{LL.common.labels.worker()}:</strong> {selectedTask.workerId}</div>}
          {selectedTask.error && (
            <div style={{ marginTop: '12px' }}>
              <strong>{LL.hub.tasks.error()}:</strong>
              <pre style={{ background: 'rgba(220,53,69,0.1)', padding: '8px', borderRadius: '4px', fontFamily: 'var(--dispatch-font-mono)', whiteSpace: 'pre-wrap' }}>
                {selectedTask.error}
              </pre>
            </div>
          )}
          {selectedTask.progress && (
            <div><strong>{LL.common.labels.progress()}:</strong> {selectedTask.progress.percent}% {selectedTask.progress.message && `- ${selectedTask.progress.message}`}</div>
          )}
          <div style={{ marginTop: '12px' }}>
            <strong>{LL.hub.tasks.payload()}:</strong>
            <pre style={{ background: 'var(--dispatch-bg-tertiary)', padding: '8px', borderRadius: '4px', fontFamily: 'var(--dispatch-font-mono)', whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: '400px' }}>
              {JSON.stringify(selectedTask.payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.hub.tasks.title()}</h1>

      <div style={filterBar}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          style={filterInput}
        >
          <option value="">{LL.hub.tasks.filterByStatus()}</option>
          <option value="pending">{LL.common.status.pending()}</option>
          <option value="running">{LL.common.status.running()}</option>
          <option value="done">{LL.common.status.done()}</option>
          <option value="failed">{LL.common.status.failed()}</option>
        </select>
        <input
          type="text"
          placeholder={LL.hub.tasks.filterByType()}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }}
          style={filterInput}
        />
        {(statusFilter || typeFilter) && (
          <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(0) }} style={{ ...filterInput, cursor: 'pointer' }}>
            {LL.common.actions.clear()}
          </button>
        )}
      </div>

      {isLoading && <div>{LL.common.labels.noData()}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            type={task.type}
            status={task.status}
            statusLabel={statusLabel(task.status)}
            priority={task.priority}
            progress={task.progress}
            createdAt={String(task.createdAt)}
            startedAt={task.startedAt ? String(task.startedAt) : task.startedAt}
            finishedAt={task.finishedAt ? String(task.finishedAt) : task.finishedAt}
            workerId={task.workerId}
            error={task.error}
            onClick={() => setSelectedTask(task)}
            labels={{
              priority: LL.common.labels.priority(),
              created: LL.common.labels.created(),
              started: LL.common.labels.started(),
              finished: LL.common.labels.finished(),
              worker: LL.common.labels.worker(),
            }}
          />
        ))}
        {!isLoading && tasks.length === 0 && (
          <div style={{ color: 'var(--dispatch-text-muted)', padding: '24px', textAlign: 'center' }}>
            {LL.hub.tasks.noTasks()}
          </div>
        )}
      </div>

      {tasks.length === PAGE_SIZE && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ ...filterInput, cursor: page === 0 ? 'default' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ padding: '6px 10px', fontSize: '13px' }}>
            {LL.hub.tasks.page({ current: page + 1, total: page + 2 })}
          </span>
          <button onClick={() => setPage((p) => p + 1)} style={{ ...filterInput, cursor: 'pointer' }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
