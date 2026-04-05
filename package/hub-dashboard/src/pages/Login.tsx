import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { CSSProperties } from 'react'

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

export function Login() {
  const { login } = useAuth()
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(token.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

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
          Sign in with your JWT token
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your JWT token here..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && (
            <p style={{ color: 'var(--dispatch-error, #ef4444)', fontSize: '13px', margin: '0 0 12px' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || !token.trim()} style={buttonStyle}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
