import type { TaskStatus } from '@rezics/dispatch-type'
import { cn } from '../lib/cn'

const tone: Record<TaskStatus, { dot: string; label: string; ring: string }> = {
  pending: {
    dot: 'var(--color-status-pending)',
    label: 'text-status-pending',
    ring: 'border-[color-mix(in_oklab,var(--color-status-pending)_55%,transparent)]',
  },
  running: {
    dot: 'var(--color-status-running)',
    label: 'text-status-running',
    ring: 'border-[color-mix(in_oklab,var(--color-status-running)_55%,transparent)]',
  },
  done: {
    dot: 'var(--color-status-done)',
    label: 'text-status-done',
    ring: 'border-[color-mix(in_oklab,var(--color-status-done)_55%,transparent)]',
  },
  failed: {
    dot: 'var(--color-status-failed)',
    label: 'text-status-failed',
    ring: 'border-[color-mix(in_oklab,var(--color-status-failed)_55%,transparent)]',
  },
}

interface StatusPillProps {
  status: TaskStatus
  label: string
  live?: boolean
  className?: string
}

export function StatusPill({ status, label, live, className }: StatusPillProps) {
  const t = tone[status]
  const pulse = live ?? (status === 'running' || status === 'pending')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em]',
        t.ring,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', pulse && 'animate-signal-pulse')}
        style={{ backgroundColor: t.dot, boxShadow: `0 0 8px ${t.dot}` }}
      />
      <span style={{ color: t.dot }}>{label}</span>
    </span>
  )
}
