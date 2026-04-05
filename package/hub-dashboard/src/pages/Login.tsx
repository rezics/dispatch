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

const linkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--dispatch-text-secondary)',
  fontSize: '13px',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'var(--dispatch-font-family)',
  textDecoration: 'underline',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--dispatch-text-secondary)',
  marginBottom: '4px',
}

type LoginMode = 'password' | 'token'

export function Login() {
  const { loginWithPassword, loginWithToken } = useAuth()
  const [mode, setMode] = useState<LoginMode>('password')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'password') {
        await loginWithPassword(username.trim(), password)
      } else {
        await loginWithToken(token.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    mode === 'password' ? username.trim() && password : token.trim()

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
          {mode === 'password' ? 'Sign in to the dashboard' : 'Sign in with a JWT token'}
        </p>
        <form onSubmit={handleSubmit}>
          {mode === 'password' ? (
            <>
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
            </>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your JWT token here..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          )}
          {error && (
            <p style={{ color: 'var(--dispatch-error, #ef4444)', fontSize: '13px', margin: '0 0 12px' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !canSubmit} style={buttonStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => { setMode(mode === 'password' ? 'token' : 'password'); setError('') }}
            style={linkStyle}
          >
            {mode === 'password' ? 'Use JWT token instead' : 'Use password instead'}
          </button>
        </div>
      </div>
    </div>
  )
}
