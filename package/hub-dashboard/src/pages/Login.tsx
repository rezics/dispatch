import { useState, type FormEvent, type CSSProperties } from 'react'
import { useAuth } from '../auth/AuthContext'

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'var(--dispatch-bg-secondary)',
  fontFamily: 'var(--dispatch-font-family)',
}

const cardStyle: CSSProperties = {
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '32px',
  width: '360px',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  background: 'var(--dispatch-bg-secondary)',
  color: 'var(--dispatch-text-primary)',
  fontFamily: 'var(--dispatch-font-family)',
  fontSize: '14px',
  boxSizing: 'border-box',
}

const buttonStyle: CSSProperties = {
  width: '100%',
  padding: '10px',
  border: 'none',
  borderRadius: 'var(--dispatch-radius)',
  background: 'var(--dispatch-accent)',
  color: '#fff',
  fontFamily: 'var(--dispatch-font-family)',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--dispatch-text-secondary)',
  marginBottom: '4px',
}

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = username.trim() && password

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '20px',
            color: 'var(--dispatch-text-primary)',
          }}
        >
          Dispatch
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: '14px',
            color: 'var(--dispatch-text-secondary)',
          }}
        >
          Sign in to the dashboard
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="root user ID"
              autoComplete="username"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>
          {error && (
            <p style={{ color: 'var(--dispatch-error, #ef4444)', fontSize: '13px', margin: '0 0 12px' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !canSubmit} style={buttonStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
