import { useEffect, useState } from 'react'

function format(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  const mm = pad(date.getUTCMonth() + 1)
  const dd = pad(date.getUTCDate())
  const hh = pad(date.getUTCHours())
  const mi = pad(date.getUTCMinutes())
  const ss = pad(date.getUTCSeconds())
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}:${ss}` }
}

export function MissionClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { date, time } = format(now)

  return (
    <div className="flex items-center gap-3 font-mono text-[11px] numeric-tabular">
      <span className="tracking-wider-caps text-muted-foreground">UTC</span>
      <span className="text-foreground/90">{date}</span>
      <span className="text-signal-amber">{time}</span>
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-signal-amber animate-signal-blink"
        style={{ backgroundColor: 'var(--color-signal-amber)' }}
      />
    </div>
  )
}
