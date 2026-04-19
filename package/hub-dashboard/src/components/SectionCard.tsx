import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface SectionCardProps {
  label: string
  title?: string
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  ticks?: boolean
}

export function SectionCard({
  label,
  title,
  meta,
  actions,
  children,
  className,
  contentClassName,
  ticks = true,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        'relative border border-border bg-card/80 backdrop-blur-sm',
        ticks && 'corner-ticks',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
        <div className="flex items-baseline gap-3">
          <span
            className="font-mono text-[10.5px] tracking-wider-caps text-signal-amber"
            style={{ color: 'var(--color-signal-amber)' }}
          >
            {label}
          </span>
          {title && (
            <h2 className="text-sm font-medium text-foreground">
              {title}
            </h2>
          )}
          {meta && <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className={cn('relative', contentClassName)}>{children}</div>
    </section>
  )
}
