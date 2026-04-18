import { useLL } from '../i18n'
import { useProjects } from '../api/hooks'
import { Card, CardContent } from '@rezics/dispatch-ui/shadcn/card'

interface Project {
  id: string
  verification: string
  createdAt: string
}

export function Plugins() {
  const LL = useLL()
  const { data, isLoading } = useProjects()

  const projects = (data ?? []) as unknown as Project[]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{LL.hub.plugins.title()}</h1>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">{LL.hub.plugins.resultPlugins()}</h2>

        {isLoading && <div className="text-muted-foreground">{LL.common.labels.noData()}</div>}

        <div className="space-y-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <strong className="font-semibold">{project.id}</strong>
                  <span className="text-xs text-muted-foreground">
                    Verification: {project.verification}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && projects.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {LL.common.labels.noData()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
