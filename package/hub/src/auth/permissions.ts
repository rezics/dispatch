// ── Permission constants ────────────────────────────────────────────

export const PERMISSIONS = {
  // Worker permissions
  WORKER_REGISTER: 'worker:register',
  WORKER_UNREGISTER: 'worker:unregister',

  // Task permissions
  TASK_CLAIM: 'task:claim',
  TASK_COMPLETE: 'task:complete',

  // Dashboard permissions
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_PROJECTS: 'dashboard:projects',
  DASHBOARD_WORKERS: 'dashboard:workers',
  DASHBOARD_TASKS: 'dashboard:tasks',
  DASHBOARD_POLICIES: 'dashboard:policies',

  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_POLICIES: 'admin:policies',
  ADMIN_ALL: 'admin:*',
} as const

// ── Types ───────────────────────────────────────────────────────────

export interface ResolvedIdentity {
  sub: string
  isRoot: boolean
  permissions: string[]
  projects: string[] | '*'
  claims: Record<string, unknown>
}

// ── Helpers ─────────────────────────────────────────────────────────

export function hasPermission(identity: ResolvedIdentity, permission: string): boolean {
  if (identity.isRoot) return true

  for (const p of identity.permissions) {
    if (p === permission) return true
    // Wildcard: "admin:*" matches "admin:policies"
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -1) // "admin:"
      if (permission.startsWith(prefix)) return true
    }
  }

  return false
}

export function hasAnyPermission(identity: ResolvedIdentity, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(identity, p))
}

export function isProjectScoped(identity: ResolvedIdentity, projectId: string): boolean {
  if (identity.isRoot) return true
  if (identity.projects === '*') return true
  return identity.projects.includes(projectId)
}
