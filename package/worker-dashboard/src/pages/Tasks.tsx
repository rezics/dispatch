import { useLL } from '../i18n'
import { useWorkerTasks } from '../api/hooks'
import { TaskCard } from '@rezics/dispatch-ui'
import type { TaskStatus } from '@rezics/dispatch-type'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

interface TaskItem {
  id: string
  type: string
  status: TaskStatus
  progress?: { percent: number; message?: string }
  startedAt: string
  finishedAt?: string
  error?: string | null
}

export function Tasks() {
  const LL = useLL()
  const { data, isLoading } = useWorkerTasks()

  const tasks = data as { active: TaskItem[]; history: TaskItem[] } | undefined

  const statusLabel = (status: TaskStatus) => LL.common.status[status]()

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.worker.tasks.title()}</h1>

      <h2 style={{ marginBottom: '12px' }}>{LL.worker.tasks.active()}</h2>
      {isLoading && <div>Loading...</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {tasks?.active.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            type={task.type}
            status={task.status}
            statusLabel={statusLabel(task.status)}
            priority={0}
            progress={task.progress}
            createdAt={task.startedAt}
            labels={{
              priority: LL.common.labels.priority(),
              created: LL.common.labels.started(),
            }}
          />
        ))}
        {tasks && tasks.active.length === 0 && (
          <div style={{ color: 'var(--dispatch-text-muted)', padding: '16px', textAlign: 'center' }}>
            {LL.worker.tasks.noActive()}
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: '12px' }}>{LL.worker.tasks.history()}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
        {tasks?.history.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            type={task.type}
            status={task.status}
            statusLabel={statusLabel(task.status)}
            priority={0}
            createdAt={task.startedAt}
            finishedAt={task.finishedAt}
            error={task.error}
            labels={{
              priority: LL.common.labels.priority(),
              created: LL.common.labels.started(),
              finished: LL.common.labels.finished(),
            }}
          />
        ))}
        {tasks && tasks.history.length === 0 && (
          <div style={{ color: 'var(--dispatch-text-muted)', padding: '16px', textAlign: 'center' }}>
            {LL.worker.tasks.noHistory()}
          </div>
        )}
      </div>
    </div>
  )
}
