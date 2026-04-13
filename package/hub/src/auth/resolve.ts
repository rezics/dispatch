import type { PrismaClient } from '#/prisma/client'

// ── Types ──────────────────────────────────────────────────────────

export interface WorkerIdentity {
  sub: string
  projects: string[] | '*'
}

export interface AdminSession {
  userId: string
  isRoot: boolean
}

// ── Policy cache ────────────────────────────────────────────────────

type CachedPolicy = {
  id: string
  issPattern: string
  claimField: string
  claimPattern: string
  projectScope: string | null
}

let policyCache: CachedPolicy[] | null = null
let policyCacheTime = 0
const POLICY_CACHE_TTL = 30_000

export function invalidatePolicyCache() {
  policyCache = null
  policyCacheTime = 0
}

async function loadPolicies(db: PrismaClient): Promise<CachedPolicy[]> {
  const now = Date.now()
  if (policyCache && now - policyCacheTime < POLICY_CACHE_TTL) {
    return policyCache
  }

  const result = await db.accessPolicy.findMany({
    select: {
      id: true,
      issPattern: true,
      claimField: true,
      claimPattern: true,
      projectScope: true,
    },
  })
  policyCache = result
  policyCacheTime = now
  return result
}

// ── Issuer glob matching ────────────────────────────────────────────

function issuerGlobToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const regexStr = escaped.replace(/\*/g, '[^.]+')
  return new RegExp(`^${regexStr}$`)
}

function matchesIssuer(issuer: string, pattern: string): boolean {
  if (pattern === issuer) return true
  return issuerGlobToRegex(pattern).test(issuer)
}

// ── Worker access resolution ────────────────────────────────────────

export async function resolveWorkerAccess(
  claims: Record<string, unknown>,
  db: PrismaClient,
): Promise<WorkerIdentity> {
  const sub = claims.sub as string
  const iss = claims.iss as string | undefined

  const policies = await loadPolicies(db)
  const projects = new Set<string>()
  let hasGlobalScope = false

  for (const policy of policies) {
    if (iss && !matchesIssuer(iss, policy.issPattern)) continue

    const claimValue = claims[policy.claimField]
    if (claimValue === undefined) continue

    const claimStr = String(claimValue)
    if (!new RegExp(policy.claimPattern).test(claimStr)) continue

    // Policy matches — add project access
    if (policy.projectScope === null) {
      hasGlobalScope = true
    } else {
      projects.add(policy.projectScope)
    }
  }

  return {
    sub,
    projects: hasGlobalScope ? '*' : [...projects],
  }
}
