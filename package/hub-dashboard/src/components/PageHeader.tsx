import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  index?: string
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  index,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'reveal flex flex-col gap-5 border-b border-border/70 pb-8 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-5">
        {index && (
          <div
            className="hidden shrink-0 font-mono text-[11px] font-medium tracking-wider-caps text-signal-amber md:block"
            aria-hidden
          >
            <div className="border border-signal-amber/40 px-2 py-1"
              style={{ borderColor: 'color-mix(in oklab, var(--color-signal-amber) 45%, transparent)' }}>
              {index}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <p
            className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
            aria-hidden
          >
            <span
              className="mr-2 inline-block size-1.5 -translate-y-[2px] rounded-full"
              style={{ backgroundColor: 'var(--color-signal-amber)' }}
            />
            {eyebrow}
          </p>
          <h1
            className="font-serif text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {title}
          </h1>
          {description && (
            <p className="max-w-xl pt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
