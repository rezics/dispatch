import { NavLink } from 'react-router-dom'
import { Moon, Sun, LogOut, LayoutGrid, Cpu, ListChecks, Plug, UserCircle2 } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useAuth } from '../auth/AuthContext'
import { useLL } from '../i18n'
import { cn } from '../lib/cn'
import { MissionClock } from './MissionClock'
import type { ComponentType } from 'react'

interface NavItem {
  to: string
  label: string
  code: string
  icon: ComponentType<{ className?: string }>
}

export function Navigation() {
  const { theme, toggle } = useTheme()
  const { logout, isRoot } = useAuth()
  const LL = useLL()

  const navItems: NavItem[] = [
    { to: '/', label: LL.hub.nav.overview(), code: '01', icon: LayoutGrid },
    { to: '/workers', label: LL.hub.nav.workers(), code: '02', icon: Cpu },
    { to: '/tasks', label: LL.hub.nav.tasks(), code: '03', icon: ListChecks },
    { to: '/plugins', label: LL.hub.nav.plugins(), code: '04', icon: Plug },
    { to: '/users', label: 'Users', code: '05', icon: UserCircle2 },
  ]

  return (
    <nav className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-card/60">
      {/* Wordmark */}
      <div className="relative border-b border-border px-5 py-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-grid-dots opacity-40"
          style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent)' }}
        />
        <div className="relative flex items-baseline gap-2">
          <span
            className="font-serif text-2xl font-semibold leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Dispatch
          </span>
          <span className="font-mono text-[10px] font-medium tracking-wider-caps text-signal-amber"
            style={{ color: 'var(--color-signal-amber)' }}>
            // v1
          </span>
        </div>
        <div className="relative mt-1 font-mono text-[10px] tracking-wider-caps text-muted-foreground">
          Signal Room
        </div>
      </div>

      {/* Nav list */}
      <div className="flex flex-col gap-1 px-3 pt-6">
        <div className="mb-3 px-2 font-mono text-[10px] tracking-wider-caps text-muted-foreground">
          · Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-foreground/80 transition-colors',
                  'hover:border-border hover:bg-accent/50 hover:text-foreground',
                  isActive &&
                    'border-border bg-accent/70 text-foreground shadow-[inset_3px_0_0_var(--color-signal-amber)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="flex size-6 items-center justify-center border border-border/70 bg-background/50 font-mono text-[10px] text-muted-foreground group-hover:text-foreground"
                    aria-hidden
                  >
                    {item.code}
                  </span>
                  <Icon className="size-4 text-muted-foreground group-hover:text-foreground" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--color-signal-amber)',
                        boxShadow: '0 0 8px var(--color-signal-amber)',
                      }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Operator footer */}
      <div className="border-t border-border px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full animate-signal-pulse"
              style={{
                backgroundColor: 'var(--color-signal-phosphor)',
                boxShadow: '0 0 10px var(--color-signal-phosphor)',
              }}
              aria-hidden
            />
            <span className="font-mono text-[11px] text-foreground">
              {isRoot ? 'root' : 'operator'}
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-wider-caps text-muted-foreground">
            online
          </span>
        </div>

        <MissionClock />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="flex flex-1 items-center justify-center gap-1.5 border border-border bg-background/40 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-signal-amber/60 hover:text-foreground"
            title={theme === 'light' ? 'Dark' : 'Light'}
          >
            {theme === 'light' ? (
              <Moon className="size-3.5" />
            ) : (
              <Sun className="size-3.5" />
            )}
            <span className="font-mono tracking-wider-caps">
              {theme === 'light' ? 'DARK' : 'LIGHT'}
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-1.5 border border-border bg-background/40 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
            title="Sign out"
          >
            <LogOut className="size-3.5" />
            <span className="font-mono tracking-wider-caps">EXIT</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
