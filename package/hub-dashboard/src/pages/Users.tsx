import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '../env'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import { Label } from '@rezics/dispatch-ui/shadcn/label'
import { Switch } from '@rezics/dispatch-ui/shadcn/switch'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Crown, Plus, UserCircle2, X } from 'lucide-react'
import { cn } from '../lib/cn'

interface User {
  id: string
  isRoot: boolean
  createdAt: string
  createdBy: string | null
}

function formatDate(raw: string): string {
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  } catch {
    return raw
  }
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

  const rootCount = users?.filter((u) => u.isRoot).length ?? 0
  const userCount = users?.length ?? 0

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SECTOR 05 · OPERATORS"
        title="Users"
        index="// 05"
        description="Operator roster. Root operators hold unrestricted access to the dispatch plane."
        actions={
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-1.5 font-mono text-[11px] tracking-wider-caps"
          >
            {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {showForm ? 'cancel' : 'new operator'}
          </Button>
        }
      />

      <div className="flex items-center gap-6 border-y border-border/70 py-3 font-mono text-[11px]">
        <div>
          <span className="tracking-wider-caps text-muted-foreground">total</span>{' '}
          <span className="ml-1 text-foreground numeric-tabular">{userCount}</span>
        </div>
        <div>
          <span className="tracking-wider-caps text-muted-foreground">root</span>{' '}
          <span
            className="ml-1 numeric-tabular"
            style={{ color: 'var(--color-signal-amber)' }}
          >
            {rootCount}
          </span>
        </div>
      </div>

      {showForm && (
        <SectionCard label="// NEW OPERATOR" title="Register identity" contentClassName="p-5">
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-64 space-y-1.5">
              <Label htmlFor="user-id" className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
                User ID (JWT sub)
              </Label>
              <Input
                id="user-id"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="operator.id"
                required
                className="font-mono text-sm"
              />
            </div>
            <label className="flex items-center gap-3 border border-border bg-background/40 px-3 py-2 text-sm cursor-pointer">
              <Switch
                checked={form.isRoot}
                onCheckedChange={(v) => setForm({ ...form, isRoot: v })}
              />
              <span className="font-mono text-[11px] tracking-wider-caps">Root operator</span>
            </label>
            <Button type="submit" disabled={createMutation.isPending} className="font-mono text-[11px] tracking-wider-caps">
              {createMutation.isPending ? 'creating…' : 'register'}
            </Button>
          </form>
          {createMutation.isError && (
            <p className="mt-3 font-mono text-[11px] text-destructive">{createMutation.error.message}</p>
          )}
        </SectionCard>
      )}

      <SectionCard label="// ROSTER" meta={isLoading ? 'syncing…' : 'live'}>
        {isLoading ? (
          <div className="px-5 py-14 text-center font-mono text-[11px] tracking-wider-caps text-muted-foreground">
            loading roster…
          </div>
        ) : !users || users.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-dashed border-border">
              <UserCircle2 className="size-5 text-muted-foreground" />
            </div>
            <p className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
              no operators
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {users.map((u, i) => (
              <li
                key={u.id}
                className={cn('reveal flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30')}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center border',
                    u.isRoot ? 'border-signal-amber/50' : 'border-border',
                  )}
                  style={u.isRoot ? { borderColor: 'color-mix(in oklab, var(--color-signal-amber) 50%, transparent)' } : undefined}
                >
                  {u.isRoot ? (
                    <Crown className="size-4" style={{ color: 'var(--color-signal-amber)' }} />
                  ) : (
                    <UserCircle2 className="size-4 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground truncate">{u.id}</span>
                    {u.isRoot && (
                      <span
                        className="border px-1.5 py-0.5 font-mono text-[9.5px] tracking-wider-caps"
                        style={{
                          color: 'var(--color-signal-amber)',
                          borderColor: 'color-mix(in oklab, var(--color-signal-amber) 45%, transparent)',
                        }}
                      >
                        ROOT
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                    registered {formatDate(u.createdAt)} · by {u.createdBy ?? '(seed)'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
