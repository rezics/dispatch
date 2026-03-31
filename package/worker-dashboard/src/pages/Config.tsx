import { useLL } from '../i18n'
import { useWorkerConfig } from '../api/hooks'
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

const tagStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: '4px',
  fontSize: '11px',
  background: 'var(--dispatch-bg-tertiary)',
  color: 'var(--dispatch-text-secondary)',
  marginRight: '4px',
}

interface PluginInfo {
  name: string
  version: string
  capabilities: string[]
  displayName?: string
}

interface ConfigData {
  concurrency: number
  mode: string
  plugins: PluginInfo[]
  configValues: Record<string, unknown>
}

export function Config() {
  const LL = useLL()
  const { data, isLoading } = useWorkerConfig()

  const config = data as ConfigData | undefined

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: '24px' }}>{LL.worker.config.title()}</h1>

      {isLoading && <div>Loading...</div>}

      {config && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.config.concurrency()}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{config.concurrency}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>{LL.worker.config.mode()}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase' }}>{config.mode}</div>
            </div>
          </div>

          <h2 style={{ marginBottom: '12px' }}>{LL.worker.config.plugins()}</h2>
          {config.plugins.map((plugin) => (
            <div key={plugin.name} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{plugin.displayName ?? plugin.name}</strong>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--dispatch-text-secondary)' }}>
                    v{plugin.version}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--dispatch-text-secondary)', marginRight: '8px' }}>
                  {LL.worker.config.pluginCapabilities()}:
                </span>
                {plugin.capabilities.map((cap) => (
                  <span key={cap} style={tagStyle}>{cap}</span>
                ))}
              </div>
            </div>
          ))}

          <h2 style={{ marginTop: '24px', marginBottom: '12px' }}>{LL.worker.config.configValues()}</h2>
          <div style={cardStyle}>
            <pre style={{
              fontFamily: 'var(--dispatch-font-mono)',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              maxHeight: '400px',
            }}>
              {JSON.stringify(config.configValues, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
