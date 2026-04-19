import { useLL } from '../i18n'
import { useProjects } from '../api/hooks'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'
import { Plug, ShieldCheck } from 'lucide-react'

interface Project {
  id: string
  verification: string
  createdAt: string
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

export function Plugins() {
  const LL = useLL()
  const { data, isLoading } = useProjects()

  const projects = (data ?? []) as unknown as Project[]

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="SECTOR 04 · EXTENSIONS"
        title={LL.hub.plugins.title()}
        index="// 04"
        description="Registered projects and the verification gates that guard their ingress lanes."
      />

      <SectionCard
        label="// RESULT PLUGINS"
        title={LL.hub.plugins.resultPlugins()}
        meta={`${projects.length} registered`}
      >
        {projects.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-dashed border-border">
              <Plug className="size-5 text-muted-foreground" />
            </div>
            <p className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
              {isLoading ? 'scanning registry…' : LL.common.labels.noData()}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {projects.map((project, i) => (
              <li
                key={project.id}
                className={cn('reveal flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30')}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center border border-border bg-background/50"
                  aria-hidden
                >
                  <Plug className="size-4 text-signal-amber" style={{ color: 'var(--color-signal-amber)' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-medium text-foreground">{project.id}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground">
                    CREATED · {formatDate(project.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 border border-border bg-background/40 px-2.5 py-1 font-mono text-[11px]">
                  <ShieldCheck
                    className="size-3.5"
                    style={{ color: 'var(--color-signal-phosphor)' }}
                  />
                  <span className="tracking-wider-caps text-muted-foreground">verify</span>
                  <span className="text-foreground">{project.verification}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
