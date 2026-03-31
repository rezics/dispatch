import { NavLink } from 'react-router-dom'
import { useTheme } from './ThemeProvider'
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
  const LL = useLL()

  const navItems = [
    { to: '/', label: LL.worker.nav.status() },
    { to: '/tasks', label: LL.worker.nav.tasks() },
    { to: '/config', label: LL.worker.nav.config() },
  ]

  return (
    <nav style={sidebarStyle}>
      <div style={{ padding: '0 20px 16px', fontWeight: 700, fontSize: '16px', color: 'var(--dispatch-text-primary)', fontFamily: 'var(--dispatch-font-family)' }}>
        Worker
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
      <div style={{ marginTop: 'auto', padding: '16px 20px' }}>
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
      </div>
    </nav>
  )
}
