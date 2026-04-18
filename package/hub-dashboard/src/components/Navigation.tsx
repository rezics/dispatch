import { NavLink } from 'react-router-dom'
import { Moon, Sun, LogOut } from 'lucide-react'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { useTheme } from './ThemeProvider'
import { useAuth } from '../auth/AuthContext'
import { useLL } from '../i18n'
import { cn } from '../lib/cn'

export function Navigation() {
  const { theme, toggle } = useTheme()
  const { logout } = useAuth()
  const LL = useLL()

  const navItems: { to: string; label: string }[] = [
    { to: '/', label: LL.hub.nav.overview() },
    { to: '/workers', label: LL.hub.nav.workers() },
    { to: '/tasks', label: LL.hub.nav.tasks() },
    { to: '/plugins', label: LL.hub.nav.plugins() },
    { to: '/users', label: 'Users' },
  ]

  return (
    <nav className="flex w-56 min-h-screen flex-col border-r border-border bg-muted/40 py-4">
      <div className="px-5 pb-4 text-base font-bold">Dispatch</div>
      <div className="flex flex-col">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'px-5 py-2.5 text-sm text-foreground hover:bg-accent transition-colors',
                isActive && 'bg-accent font-semibold',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <div className="mt-auto px-3 pt-4 flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={toggle} className="w-full justify-start gap-2">
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-muted-foreground">
          <LogOut className="size-4" />
          Sign Out
        </Button>
      </div>
    </nav>
  )
}
