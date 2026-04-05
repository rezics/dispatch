import { useState, type FormEvent, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
  width: '100%',
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

interface Policy {
  id: string
  issPattern: string
  claimField: string
  claimPattern: string
  permissions: string[]
  projectScope: string | null
  createdBy: string
  createdAt: string
}

export function Policies() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    issPattern: '',
    claimField: '',
    claimPattern: '',
    permissions: '',
    projectScope: '',
  })

  const { data: policies, isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await fetch('/policies', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load policies')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issPattern: data.issPattern,
          claimField: data.claimField,
          claimPattern: data.claimPattern,
          permissions: data.permissions.split(',').map((s) => s.trim()).filter(Boolean),
          projectScope: data.projectScope || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create policy')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
      setShowForm(false)
      setForm({ issPattern: '', claimField: '', claimPattern: '', permissions: '', projectScope: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/policies/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Failed to delete policy')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: 'var(--dispatch-text-primary)', fontFamily: 'var(--dispatch-font-family)' }}>
          Trust Policies
        </h1>
        <button style={btnStyle} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Policy'}
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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>Issuer Pattern</label>
            <input style={inputStyle} value={form.issPattern} onChange={(e) => setForm({ ...form, issPattern: e.target.value })} placeholder="*.rezics.com" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>Claim Field</label>
            <input style={inputStyle} value={form.claimField} onChange={(e) => setForm({ ...form, claimField: e.target.value })} placeholder="role" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>Claim Pattern (regex)</label>
            <input style={inputStyle} value={form.claimPattern} onChange={(e) => setForm({ ...form, claimPattern: e.target.value })} placeholder="^owner$" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>Permissions (comma-separated)</label>
            <input style={inputStyle} value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} placeholder="admin:*, dashboard:*" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginBottom: '4px' }}>Project Scope (optional claim field)</label>
            <input style={inputStyle} value={form.projectScope} onChange={(e) => setForm({ ...form, projectScope: e.target.value })} placeholder="project" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={btnStyle} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: 'var(--dispatch-bg-primary)', border: '1px solid var(--dispatch-border)', borderRadius: 'var(--dispatch-radius)', overflow: 'auto' }}>
        {isLoading ? (
          <p style={{ padding: '16px', color: 'var(--dispatch-text-secondary)' }}>Loading...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Issuer Pattern</th>
                <th style={thStyle}>Claim Field</th>
                <th style={thStyle}>Claim Pattern</th>
                <th style={thStyle}>Permissions</th>
                <th style={thStyle}>Project Scope</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies?.map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}><code>{p.issPattern}</code></td>
                  <td style={tdStyle}><code>{p.claimField}</code></td>
                  <td style={tdStyle}><code>{p.claimPattern}</code></td>
                  <td style={tdStyle}>{p.permissions.join(', ')}</td>
                  <td style={tdStyle}>{p.projectScope ?? '(global)'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => deleteMutation.mutate(p.id)}
                      style={{ ...btnStyle, background: 'var(--dispatch-error, #ef4444)', fontSize: '12px', padding: '4px 10px' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(!policies || policies.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--dispatch-text-secondary)' }}>
                    No trust policies configured
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
