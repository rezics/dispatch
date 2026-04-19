import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface StatReadoutProps {
  label: string
  value: ReactNode
  code?: string
  accent?: 'amber' | 'phosphor' | 'cyan' | 'crimson' | 'violet' | 'muted'
  pulse?: boolean
  suffix?: ReactNode
  delay?: number
}

const accentColor: Record<NonNullable<StatReadoutProps['accent']>, string> = {
  amber: 'var(--color-signal-amber)',
  phosphor: 'var(--color-signal-phosphor)',
  cyan: 'var(--color-signal-cyan)',
  crimson: 'var(--color-signal-crimson)',
  violet: 'var(--color-signal-violet)',
  muted: 'var(--color-muted-foreground)',
}

export function StatReadout({
  label,
  value,
  code,
  accent = 'amber',
  pulse,
  suffix,
  delay = 0,
}: StatReadoutProps) {
  const color = accentColor[accent]
  return (
    <div
      className={cn(
        'reveal relative border border-border bg-card/70 p-5 corner-ticks transition-all',
        'hover:border-foreground/30 hover:bg-card',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
          {label}
        </span>
        {code && (
          <span className="font-mono text-[9.5px] tracking-wider-caps text-muted-foreground/80">
            {code}
          </span>
        )}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div
          className="font-mono text-4xl font-medium leading-none numeric-tabular"
          style={{ color }}
        >
          {value}
        </div>
        {pulse && (
          <span
            aria-hidden
            className="mb-2 size-2 rounded-full animate-signal-pulse"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
        )}
      </div>
      {suffix && <div className="mt-3 font-mono text-[11px] text-muted-foreground">{suffix}</div>}
    </div>
  )
}
