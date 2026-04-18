import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '../env'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import { Label } from '@rezics/dispatch-ui/shadcn/label'
import { Card, CardContent } from '@rezics/dispatch-ui/shadcn/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@rezics/dispatch-ui/shadcn/table'

interface Policy {
  id: string
  issPattern: string
  claimField: string
  claimPattern: string
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
    projectScope: '',
  })

  const { data: policies, isLoading } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await fetch(`${env.VITE_API_URL}/policies`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load policies')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${env.VITE_API_URL}/policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          issPattern: data.issPattern,
          claimField: data.claimField,
          claimPattern: data.claimPattern,
          projectScope: data.projectScope || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create policy')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
      setShowForm(false)
      setForm({ issPattern: '', claimField: '', claimPattern: '', projectScope: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${env.VITE_API_URL}/policies/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete policy')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Access Policies</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Policy'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="iss">Issuer Pattern</Label>
                <Input
                  id="iss"
                  value={form.issPattern}
                  onChange={(e) => setForm({ ...form, issPattern: e.target.value })}
                  placeholder="*.rezics.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-field">Claim Field</Label>
                <Input
                  id="claim-field"
                  value={form.claimField}
                  onChange={(e) => setForm({ ...form, claimField: e.target.value })}
                  placeholder="role"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim-pattern">Claim Pattern (regex)</Label>
                <Input
                  id="claim-pattern"
                  value={form.claimPattern}
                  onChange={(e) => setForm({ ...form, claimPattern: e.target.value })}
                  placeholder="^owner$"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scope">Project Scope (optional)</Label>
                <Input
                  id="scope"
                  value={form.projectScope}
                  onChange={(e) => setForm({ ...form, projectScope: e.target.value })}
                  placeholder="my-project"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issuer Pattern</TableHead>
                  <TableHead>Claim Field</TableHead>
                  <TableHead>Claim Pattern</TableHead>
                  <TableHead>Project Scope</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <code>{p.issPattern}</code>
                    </TableCell>
                    <TableCell>
                      <code>{p.claimField}</code>
                    </TableCell>
                    <TableCell>
                      <code>{p.claimPattern}</code>
                    </TableCell>
                    <TableCell>{p.projectScope ?? '(global)'}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!policies || policies.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No access policies configured
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
