import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '../env'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import { Label } from '@rezics/dispatch-ui/shadcn/label'
import { Switch } from '@rezics/dispatch-ui/shadcn/switch'
import { Card, CardContent } from '@rezics/dispatch-ui/shadcn/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rezics/dispatch-ui/shadcn/table'

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New User'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-48 space-y-1.5">
                <Label htmlFor="user-id">User ID (JWT sub)</Label>
                <Input
                  id="user-id"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="user-id"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isRoot}
                  onCheckedChange={(v) => setForm({ ...form, isRoot: v })}
                />
                Root user
              </label>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {createMutation.isError && (
        <p className="text-sm text-destructive">{createMutation.error.message}</p>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Root</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell>{u.isRoot ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{u.createdBy ?? '(seed)'}</TableCell>
                  </TableRow>
                ))}
                {(!users || users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      No users
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
