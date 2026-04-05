import type { PrismaClient } from '#/prisma/client'
import type { ResolvedIdentity } from './permissions'

// ── Policy cache ────────────────────────────────────────────────────

type CachedPolicy = {
  id: string
  issPattern: string
  claimField: string
  claimPattern: string
  permissions: string[]
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

  policyCache = await db.trustPolicy.findMany({
    select: {
      id: true,
      issPattern: true,
      claimField: true,
      claimPattern: true,
      permissions: true,
      projectScope: true,
    },
  })
  policyCacheTime = now
  return policyCache
}

// ── Issuer glob matching ────────────────────────────────────────────

function issuerGlobToRegex(pattern: string): RegExp {
  // Escape regex special chars except *, then replace * with single-segment match
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const regexStr = escaped.replace(/\*/g, '[^.]+')
  return new RegExp(`^${regexStr}$`)
}

function matchesIssuer(issuer: string, pattern: string): boolean {
  if (pattern === issuer) return true
  return issuerGlobToRegex(pattern).test(issuer)
}

// ── Identity resolution ─────────────────────────────────────────────

export async function resolveIdentity(
  claims: Record<string, unknown>,
  db: PrismaClient,
): Promise<ResolvedIdentity> {
  const sub = claims.sub as string
  const iss = claims.iss as string | undefined

  // Check User table for root status
  const user = await db.user.findUnique({ where: { id: sub } })
  if (user?.isRoot) {
    return {
      sub,
      isRoot: true,
      permissions: ['*'],
      projects: '*',
      claims,
    }
  }

  // Match against trust policies
  const policies = await loadPolicies(db)
  const permissions = new Set<string>()
  const projects = new Set<string>()
  let hasGlobalScope = false

  for (const policy of policies) {
    // Check issuer match
    if (iss && !matchesIssuer(iss, policy.issPattern)) continue

    // Check claim field + regex match
    const claimValue = claims[policy.claimField]
    if (claimValue === undefined) continue

    const claimStr = String(claimValue)
    if (!new RegExp(policy.claimPattern).test(claimStr)) continue

    // Policy matches — add permissions
    for (const perm of policy.permissions) {
      permissions.add(perm)
    }

    // Resolve project scope
    if (policy.projectScope === null) {
      hasGlobalScope = true
    } else {
      const projectId = claims[policy.projectScope]
      if (typeof projectId === 'string') {
        projects.add(projectId)
      }
    }
  }

  return {
    sub,
    isRoot: false,
    permissions: [...permissions],
    projects: hasGlobalScope ? '*' : [...projects],
    claims,
  }
}
