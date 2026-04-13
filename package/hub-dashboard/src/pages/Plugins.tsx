import { useLL } from '../i18n'
import { useProjects } from '../api/hooks'
import type { CSSProperties } from 'react'

const pageStyle: CSSProperties = {
  padding: '24px',
  fontFamily: 'var(--dispatch-font-family)',
  color: 'var(--dispatch-text-primary)',
}

const cardStyle: CSSProperties = {
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '16px',
  boxShadow: 'var(--dispatch-shadow)',
  marginBottom: '12px',
}

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
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.hub.plugins.title()}</h1>

      <h2 style={{ marginBottom: '12px' }}>{LL.hub.plugins.resultPlugins()}</h2>

      {isLoading && <div>{LL.common.labels.noData()}</div>}

      {projects.map((project) => (
        <div key={project.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{project.id}</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>
                Verification: {project.verification}
              </span>
            </div>
          </div>
        </div>
      ))}

      {!isLoading && projects.length === 0 && (
        <div style={{ color: 'var(--dispatch-text-muted)', padding: '24px', textAlign: 'center' }}>
          {LL.common.labels.noData()}
        </div>
      )}
    </div>
  )
}
