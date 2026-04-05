import { NavLink } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
import { useAuth } from '../auth/AuthContext'
import { useLL } from '../i18n'
import type { CSSProperties } from 'react'

const sidebarStyle: CSSProperties = {
  width: '220px',
  minHeight: '100vh',
  background: 'var(--dispatch-bg-secondary)',
  borderRight: '1px solid var(--dispatch-border)',
  padding: '16px 0',
  display: 'flex',
  flexDirection: 'column',
}

const linkStyle: CSSProperties = {
  display: 'block',
  padding: '10px 20px',
  color: 'var(--dispatch-text-primary)',
  textDecoration: 'none',
  fontSize: '14px',
  fontFamily: 'var(--dispatch-font-family)',
}

const activeLinkStyle: CSSProperties = {
  ...linkStyle,
  background: 'var(--dispatch-bg-tertiary)',
  fontWeight: 600,
}

export function Navigation() {
  const { theme, toggle } = useTheme()
  const { hasPermission, logout } = useAuth()
  const LL = useLL()

  const navItems = [
    { to: '/', label: LL.hub.nav.overview() },
    { to: '/workers', label: LL.hub.nav.workers() },
    { to: '/tasks', label: LL.hub.nav.tasks() },
    { to: '/plugins', label: LL.hub.nav.plugins() },
  ]

  if (hasPermission('admin:policies')) {
    navItems.push({ to: '/policies', label: 'Policies' })
  }
  if (hasPermission('admin:users')) {
    navItems.push({ to: '/users', label: 'Users' })
  }

  return (
    <nav style={sidebarStyle}>
      <div style={{ padding: '0 20px 16px', fontWeight: 700, fontSize: '16px', color: 'var(--dispatch-text-primary)', fontFamily: 'var(--dispatch-font-family)' }}>
        Dispatch
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => (isActive ? activeLinkStyle : linkStyle)}
        >
          {item.label}
        </NavLink>
      ))}
      <div style={{ marginTop: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={toggle}
          style={{
            background: 'var(--dispatch-bg-tertiary)',
            border: '1px solid var(--dispatch-border)',
            borderRadius: 'var(--dispatch-radius)',
            padding: '6px 12px',
            color: 'var(--dispatch-text-primary)',
            cursor: 'pointer',
            fontFamily: 'var(--dispatch-font-family)',
            fontSize: '13px',
            width: '100%',
          }}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid var(--dispatch-border)',
            borderRadius: 'var(--dispatch-radius)',
            padding: '6px 12px',
            color: 'var(--dispatch-text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--dispatch-font-family)',
            fontSize: '13px',
            width: '100%',
          }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
