import { useState, type FormEvent, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '../env'

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
  fontFamily: 'var(--dispatch-font-family)',
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid var(--dispatch-border)',
  color: 'var(--dispatch-text-secondary)',
  fontWeight: 600,
  fontSize: '12px',
}

const tdStyle: CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--dispatch-border)',
  color: 'var(--dispatch-text-primary)',
}

const inputStyle: CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  background: 'var(--dispatch-bg-secondary)',
  color: 'var(--dispatch-text-primary)',
  fontFamily: 'var(--dispatch-font-family)',
  fontSize: '13px',
  boxSizing: 'border-box',
}

const btnStyle: CSSProperties = {
  padding: '6px 14px',
  border: 'none',
  borderRadius: 'var(--dispatch-radius)',
  background: 'var(--dispatch-accent)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: 'var(--dispatch-font-family)',
}

interface User {
  id: string
  isRoot: boolean
  createdAt: string
  createdBy: string | null
}

export function Users() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ id: '', isRoot: false })

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`${env.VITE_API_URL}/users`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load users')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to create user' }))
        throw new Error(body.error)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setForm({ id: '', isRoot: false })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: 'var(--dispatch-text-primary)', fontFamily: 'var(--dispatch-font-family)' }}>
          Users
        </h1>
        <button style={btnStyle} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--dispatch-bg-primary)',
            border: '1px solid var(--dispatch-border)',
            borderRadius: 'var(--dispatch-radius)',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>User ID (JWT sub)</label>
            <input style={inputStyle} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="user-id" required />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--dispatch-text-primary)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.isRoot} onChange={(e) => setForm({ ...form, isRoot: e.target.checked })} />
            Root user
          </label>
          <button type="submit" style={btnStyle} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {createMutation.isError && (
        <p style={{ color: 'var(--dispatch-error, #ef4444)', fontSize: '13px', marginBottom: '12px' }}>
          {createMutation.error.message}
        </p>
      )}

      <div style={{ background: 'var(--dispatch-bg-primary)', border: '1px solid var(--dispatch-border)', borderRadius: 'var(--dispatch-radius)', overflow: 'auto' }}>
        {isLoading ? (
          <p style={{ padding: '16px', color: 'var(--dispatch-text-secondary)' }}>Loading...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Root</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Created By</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id}>
                  <td style={tdStyle}><code>{u.id}</code></td>
                  <td style={tdStyle}>{u.isRoot ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>{new Date(u.createdAt).toLocaleString()}</td>
                  <td style={tdStyle}>{u.createdBy ?? '(seed)'}</td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--dispatch-text-secondary)' }}>
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
