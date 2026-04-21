import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Plus, X, Plug, ShieldCheck, Pencil, Trash2, Eraser, AlertTriangle } from 'lucide-react'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import { Label } from '@rezics/dispatch-ui/shadcn/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rezics/dispatch-ui/shadcn/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rezics/dispatch-ui/shadcn/select'
import { useLL } from '../i18n'
import { useAuth } from '../auth/AuthContext'
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useClearProjectTasks,
  ProjectHasTasksError,
  type ProjectMutationInput,
  type ProjectUpdateInput,
} from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'

interface Project {
  id: string
  verification: string
  receiptSecret: string | null
  jwksUri: string | null
  maxTaskHoldTime: number | null
  allowedTypes: string[]
  createdAt: string
}

interface FormState {
  id: string
  verification: string
  receiptSecret: string
  jwksUri: string
  maxTaskHoldTime: string
  allowedTypes: string[]
}

const EMPTY_FORM: FormState = {
  id: '',
  verification: 'receipted',
  receiptSecret: '',
  jwksUri: '',
  maxTaskHoldTime: '',
  allowedTypes: [],
}

function formatDate(raw: string): string {
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return raw
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  } catch {
    return raw
  }
}

function projectToForm(project: Project): FormState {
  return {
    id: project.id,
    verification: project.verification ?? 'receipted',
    receiptSecret: project.receiptSecret ?? '',
    jwksUri: project.jwksUri ?? '',
    maxTaskHoldTime: project.maxTaskHoldTime != null ? String(project.maxTaskHoldTime) : '',
    allowedTypes: project.allowedTypes ?? [],
  }
}

function buildUpdatePayload(form: FormState): ProjectUpdateInput {
  const payload: ProjectUpdateInput = {
    verification: form.verification,
    jwksUri: form.jwksUri.trim() || undefined,
    allowedTypes: form.allowedTypes,
  }
  if (form.maxTaskHoldTime.trim() !== '') {
    const n = Number(form.maxTaskHoldTime)
    if (Number.isFinite(n) && n > 0) payload.maxTaskHoldTime = Math.floor(n)
  }
  if (form.verification === 'receipted' && form.receiptSecret.trim() !== '') {
    payload.receiptSecret = form.receiptSecret.trim()
  }
  return payload
}

function buildCreatePayload(form: FormState): ProjectMutationInput {
  return { id: form.id.trim(), ...buildUpdatePayload(form) }
}

interface FormFieldsProps {
  form: FormState
  setForm: (next: FormState) => void
  isEdit: boolean
}

function FormFields({ form, setForm, isEdit }: FormFieldsProps) {
  const LL = useLL()
  const [typeDraft, setTypeDraft] = useState('')

  function addType() {
    const v = typeDraft.trim()
    if (!v) return
    if (form.allowedTypes.includes(v)) {
      setTypeDraft('')
      return
    }
    setForm({ ...form, allowedTypes: [...form.allowedTypes, v] })
    setTypeDraft('')
  }

  function handleTypeKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addType()
    } else if (e.key === 'Backspace' && typeDraft === '' && form.allowedTypes.length) {
      setForm({ ...form, allowedTypes: form.allowedTypes.slice(0, -1) })
    }
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="project-id"
          className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
        >
          {LL.hub.projects.formId()}
        </Label>
        <Input
          id="project-id"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="crawl"
          required
          disabled={isEdit}
          className="font-mono text-sm"
        />
        {!isEdit && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {LL.hub.projects.formIdHint()}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
          {LL.hub.projects.formVerification()}
        </Label>
        <Select
          value={form.verification}
          onValueChange={(v) => setForm({ ...form, verification: v })}
        >
          <SelectTrigger className="w-full font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{LL.hub.projects.verifyNone()}</SelectItem>
            <SelectItem value="receipted">{LL.hub.projects.verifyReceipted()}</SelectItem>
            <SelectItem value="audited">{LL.hub.projects.verifyAudited()}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.verification === 'receipted' && (
        <div className="space-y-1.5">
          <Label
            htmlFor="project-receipt-secret"
            className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
          >
            {LL.hub.projects.formReceiptSecret()}
          </Label>
          <Input
            id="project-receipt-secret"
            type="password"
            value={form.receiptSecret}
            onChange={(e) => setForm({ ...form, receiptSecret: e.target.value })}
            placeholder="••••••••"
            className="font-mono text-sm"
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {LL.hub.projects.formReceiptSecretHint()}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label
          htmlFor="project-jwks"
          className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
        >
          {LL.hub.projects.formJwksUri()}
        </Label>
        <Input
          id="project-jwks"
          value={form.jwksUri}
          onChange={(e) => setForm({ ...form, jwksUri: e.target.value })}
          placeholder="https://issuer.example/.well-known/jwks.json"
          className="font-mono text-sm"
        />
        <p className="font-mono text-[10px] text-muted-foreground">
          {LL.hub.projects.formJwksHint()}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="project-max-hold"
          className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
        >
          {LL.hub.projects.formMaxHold()}
        </Label>
        <Input
          id="project-max-hold"
          type="number"
          inputMode="numeric"
          min={1}
          value={form.maxTaskHoldTime}
          onChange={(e) => setForm({ ...form, maxTaskHoldTime: e.target.value })}
          placeholder="optional"
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="project-types"
          className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
        >
          {LL.hub.projects.formAllowedTypes()}
        </Label>
        <div className="flex flex-wrap items-center gap-1.5 border border-input bg-transparent px-2 py-1.5 rounded-md">
          {form.allowedTypes.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 border border-border bg-background/50 px-2 py-0.5 font-mono text-[11px]"
            >
              {tag}
              <button
                type="button"
                aria-label={`remove ${tag}`}
                onClick={() =>
                  setForm({ ...form, allowedTypes: form.allowedTypes.filter((t) => t !== tag) })
                }
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            id="project-types"
            value={typeDraft}
            onChange={(e) => setTypeDraft(e.target.value)}
            onKeyDown={handleTypeKey}
            onBlur={addType}
            placeholder={form.allowedTypes.length === 0 ? 'book:crawl' : ''}
            className="min-w-[8ch] flex-1 bg-transparent font-mono text-sm outline-none"
          />
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          {LL.hub.projects.formAllowedTypesHint()}
        </p>
      </div>
    </div>
  )
}

function VerificationBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-border bg-background/40 px-2 py-0.5 font-mono text-[11px]">
      <ShieldCheck
        className="size-3"
        style={{ color: 'var(--color-signal-phosphor)' }}
      />
      <span className="tracking-wider-caps text-muted-foreground">{value}</span>
    </span>
  )
}

export function Projects() {
  const LL = useLL()
  const { isRoot } = useAuth()
  const { data, isLoading } = useProjects()
  const projects = (data ?? []) as unknown as Project[]

  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()
  const clearMutation = useClearProjectTasks()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)

  const [editing, setEditing] = useState<Project | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [blockedDelete, setBlockedDelete] = useState<{ project: Project; taskCount: number } | null>(
    null,
  )

  const [clearTarget, setClearTarget] = useState<Project | null>(null)
  const [clearConfirm, setClearConfirm] = useState('')
  const [clearResult, setClearResult] = useState<number | null>(null)

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    createMutation.reset()
    setCreateOpen(true)
  }

  function handleCreateSubmit(e: FormEvent) {
    e.preventDefault()
    createMutation.mutate(buildCreatePayload(createForm), {
      onSuccess: () => {
        setCreateOpen(false)
        setCreateForm(EMPTY_FORM)
      },
    })
  }

  function openEdit(project: Project) {
    setEditing(project)
    setEditForm(projectToForm(project))
    updateMutation.reset()
  }

  function handleEditSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    updateMutation.mutate(
      { id: editing.id, ...buildUpdatePayload(editForm) },
      {
        onSuccess: () => setEditing(null),
      },
    )
  }

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    const project = confirmDelete
    deleteMutation.mutate(project.id, {
      onSuccess: () => {
        setConfirmDelete(null)
        deleteMutation.reset()
      },
      onError: (err) => {
        if (err instanceof ProjectHasTasksError) {
          setConfirmDelete(null)
          setBlockedDelete({ project, taskCount: err.taskCount })
        }
      },
    })
  }

  function handleClearSubmit() {
    if (!clearTarget) return
    if (clearConfirm !== clearTarget.id) return
    const project = clearTarget
    clearMutation.mutate(project.id, {
      onSuccess: (data) => {
        setClearResult(data?.deleted ?? 0)
        setClearConfirm('')
      },
    })
  }

  function closeClear() {
    setClearTarget(null)
    setClearConfirm('')
    setClearResult(null)
    clearMutation.reset()
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={LL.hub.projects.eyebrow()}
        title={LL.hub.projects.title()}
        index="// 02"
        description={LL.hub.projects.description()}
        actions={
          isRoot && (
            <Button
              onClick={openCreate}
              className="gap-1.5 font-mono text-[11px] tracking-wider-caps"
            >
              <Plus className="size-3.5" />
              {LL.hub.projects.newProject()}
            </Button>
          )
        }
      />

      <div className="flex items-center gap-6 border-y border-border/70 py-4 font-mono text-[11px]">
        <div>
          <span className="tracking-wider-caps text-muted-foreground">total</span>{' '}
          <span className="ml-1 numeric-tabular text-foreground">{projects.length}</span>
        </div>
      </div>

      <SectionCard
        label={LL.hub.projects.sectionLabel()}
        meta={isLoading ? 'syncing…' : 'live'}
      >
        {projects.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-dashed border-border">
              <Plug className="size-5 text-muted-foreground" />
            </div>
            <p className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
              {isLoading ? 'scanning registry…' : LL.hub.projects.empty()}
            </p>
            {!isLoading && isRoot && (
              <>
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  {LL.hub.projects.emptyHint()}
                </p>
                <Button
                  onClick={openCreate}
                  className="mt-5 gap-1.5 font-mono text-[11px] tracking-wider-caps"
                >
                  <Plus className="size-3.5" />
                  {LL.hub.projects.newProject()}
                </Button>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {projects.map((project, i) => (
              <li
                key={project.id}
                className={cn(
                  'reveal flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30',
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center border border-border bg-background/50"
                  aria-hidden
                >
                  <Plug
                    className="size-4 text-signal-amber"
                    style={{ color: 'var(--color-signal-amber)' }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-medium text-foreground">{project.id}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
                    {LL.hub.projects.colCreated()} · {formatDate(project.createdAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <VerificationBadge value={project.verification ?? 'receipted'} />
                  <span
                    className="inline-flex items-center gap-1.5 border border-border bg-background/40 px-2 py-0.5 font-mono text-[11px]"
                    title={project.jwksUri ?? ''}
                  >
                    <span className="tracking-wider-caps text-muted-foreground">
                      {LL.hub.projects.colJwks()}
                    </span>
                    <span
                      className={cn(
                        project.jwksUri ? 'text-foreground' : 'text-muted-foreground/70',
                      )}
                    >
                      {project.jwksUri
                        ? LL.hub.projects.jwksPresent()
                        : LL.hub.projects.jwksMissing()}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 border border-border bg-background/40 px-2 py-0.5 font-mono text-[11px]">
                    <span className="tracking-wider-caps text-muted-foreground">
                      {LL.hub.projects.colTypes()}
                    </span>
                    <span className="text-foreground numeric-tabular">
                      {project.allowedTypes && project.allowedTypes.length > 0
                        ? project.allowedTypes.length
                        : LL.hub.projects.typesAll()}
                    </span>
                  </span>
                </div>
                {isRoot && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(project)}
                      className="flex items-center gap-1 border border-border bg-background/40 px-2 py-1 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground transition-colors hover:border-signal-amber/60 hover:text-foreground"
                      title={LL.hub.projects.actionEdit()}
                    >
                      <Pencil className="size-3" />
                      <span>{LL.hub.projects.actionEdit()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClearResult(null)
                        setClearConfirm('')
                        setClearTarget(project)
                      }}
                      className="flex items-center gap-1 border border-border bg-background/40 px-2 py-1 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground transition-colors hover:border-signal-amber/60 hover:text-foreground"
                      title={LL.hub.projects.actionClear()}
                    >
                      <Eraser className="size-3" />
                      <span>{LL.hub.projects.actionClear()}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteMutation.reset()
                        setBlockedDelete(null)
                        setConfirmDelete(project)
                      }}
                      className="flex items-center gap-1 border border-border bg-background/40 px-2 py-1 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                      title={LL.hub.projects.actionDelete()}
                    >
                      <Trash2 className="size-3" />
                      <span>{LL.hub.projects.actionDelete()}</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            createMutation.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LL.hub.projects.createTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <FormFields form={createForm} setForm={setCreateForm} isEdit={false} />
            {createMutation.isError && (
              <p className="font-mono text-[11px] text-destructive">
                {(createMutation.error as Error)?.message ?? 'Failed to create project'}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="font-mono text-[11px] tracking-wider-caps"
              >
                {LL.hub.projects.cancel()}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || createForm.id.trim() === ''}
                className="font-mono text-[11px] tracking-wider-caps"
              >
                {createMutation.isPending
                  ? LL.hub.projects.submitting()
                  : LL.hub.projects.submitCreate()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
            updateMutation.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LL.hub.projects.editTitle()}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <FormFields form={editForm} setForm={setEditForm} isEdit />
            {updateMutation.isError && (
              <p className="font-mono text-[11px] text-destructive">
                {(updateMutation.error as Error)?.message ?? 'Failed to update project'}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                className="font-mono text-[11px] tracking-wider-caps"
              >
                {LL.hub.projects.cancel()}
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="font-mono text-[11px] tracking-wider-caps"
              >
                {updateMutation.isPending
                  ? LL.hub.projects.submitting()
                  : LL.hub.projects.submitUpdate()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDelete(null)
            deleteMutation.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LL.hub.projects.deleteConfirmTitle()}</DialogTitle>
            <DialogDescription>{LL.hub.projects.deleteConfirmDesc()}</DialogDescription>
          </DialogHeader>
          {confirmDelete && (
            <p className="font-mono text-sm text-foreground">{confirmDelete.id}</p>
          )}
          {deleteMutation.isError && !(deleteMutation.error instanceof ProjectHasTasksError) && (
            <p className="font-mono text-[11px] text-destructive">
              {(deleteMutation.error as Error)?.message ?? 'Failed to delete project'}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              className="font-mono text-[11px] tracking-wider-caps"
            >
              {LL.hub.projects.cancel()}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
              className="font-mono text-[11px] tracking-wider-caps"
            >
              {deleteMutation.isPending
                ? LL.hub.projects.submitting()
                : LL.hub.projects.actionDelete()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked delete (409) dialog */}
      <Dialog
        open={!!blockedDelete}
        onOpenChange={(open) => {
          if (!open) setBlockedDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                {LL.hub.projects.deleteBlockedTitle()}
              </span>
            </DialogTitle>
            <DialogDescription>
              {blockedDelete &&
                LL.hub.projects.deleteBlockedDesc({ count: blockedDelete.taskCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlockedDelete(null)}
              className="font-mono text-[11px] tracking-wider-caps"
            >
              {LL.hub.projects.cancel()}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!blockedDelete) return
                const project = blockedDelete.project
                setBlockedDelete(null)
                setClearResult(null)
                setClearConfirm('')
                setClearTarget(project)
              }}
              className="font-mono text-[11px] tracking-wider-caps"
            >
              <Eraser className="size-3" />
              {LL.hub.projects.actionClear()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear tasks dialog */}
      <Dialog open={!!clearTarget} onOpenChange={(open) => !open && closeClear()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LL.hub.projects.clearTasksTitle()}</DialogTitle>
            <DialogDescription>{LL.hub.projects.clearTasksDesc()}</DialogDescription>
          </DialogHeader>
          {clearTarget && clearResult === null && (
            <div className="space-y-3">
              <p className="font-mono text-sm text-foreground">{clearTarget.id}</p>
              <div className="space-y-1.5">
                <Label
                  htmlFor="clear-confirm"
                  className="font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
                >
                  {LL.hub.projects.clearTasksLabel()}
                </Label>
                <Input
                  id="clear-confirm"
                  autoFocus
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder={clearTarget.id}
                  className="font-mono text-sm"
                />
                {clearConfirm !== '' && clearConfirm !== clearTarget.id && (
                  <p className="font-mono text-[10.5px] text-destructive">
                    {LL.hub.projects.clearTasksMismatch()}
                  </p>
                )}
              </div>
            </div>
          )}
          {clearResult !== null && (
            <p className="font-mono text-sm text-foreground">
              {LL.hub.projects.clearTasksSuccess({ count: clearResult })}
            </p>
          )}
          {clearMutation.isError && (
            <p className="font-mono text-[11px] text-destructive">
              {(clearMutation.error as Error)?.message ?? 'Failed to clear tasks'}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeClear}
              className="font-mono text-[11px] tracking-wider-caps"
            >
              {clearResult !== null ? 'close' : LL.hub.projects.cancel()}
            </Button>
            {clearResult === null && (
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !clearTarget || clearConfirm !== clearTarget.id || clearMutation.isPending
                }
                onClick={handleClearSubmit}
                className="font-mono text-[11px] tracking-wider-caps"
              >
                {clearMutation.isPending
                  ? LL.hub.projects.clearTasksRunning()
                  : LL.hub.projects.clearTasksSubmit()}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
