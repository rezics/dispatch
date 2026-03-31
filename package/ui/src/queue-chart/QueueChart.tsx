import type { CSSProperties } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export interface QueueDataPoint {
  time: string
  pending: number
  running: number
}

export interface ThroughputDataPoint {
  time: string
  completed: number
}

export interface QueueChartProps {
  queueData: QueueDataPoint[]
  throughputData?: ThroughputDataPoint[]
  emptyMessage?: string
  labels?: {
    pending?: string
    running?: string
    completed?: string
  }
}

const containerStyle: CSSProperties = {
  fontFamily: 'var(--dispatch-font-family)',
  background: 'var(--dispatch-bg-primary)',
  border: '1px solid var(--dispatch-border)',
  borderRadius: 'var(--dispatch-radius)',
  padding: '16px',
  color: 'var(--dispatch-text-primary)',
}

const emptyStyle: CSSProperties = {
  ...containerStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  color: 'var(--dispatch-text-muted)',
}

export function QueueChart({
  queueData,
  throughputData,
  emptyMessage = 'No data available',
  labels = {},
}: QueueChartProps) {
  if (queueData.length === 0) {
    return <div style={emptyStyle}>{emptyMessage}</div>
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <LineChart data={queueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dispatch-border)" />
            <XAxis dataKey="time" stroke="var(--dispatch-text-secondary)" fontSize={11} />
            <YAxis stroke="var(--dispatch-text-secondary)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: 'var(--dispatch-bg-secondary)',
                border: '1px solid var(--dispatch-border)',
                borderRadius: 'var(--dispatch-radius)',
                color: 'var(--dispatch-text-primary)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pending"
              name={labels.pending ?? 'Pending'}
              stroke="var(--dispatch-chart-line-pending)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="running"
              name={labels.running ?? 'Running'}
              stroke="var(--dispatch-chart-line-running)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {throughputData && throughputData.length > 0 && (
        <div style={{ width: '100%', height: 200, marginTop: '16px' }}>
          <ResponsiveContainer>
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--dispatch-border)" />
              <XAxis dataKey="time" stroke="var(--dispatch-text-secondary)" fontSize={11} />
              <YAxis stroke="var(--dispatch-text-secondary)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--dispatch-bg-secondary)',
                  border: '1px solid var(--dispatch-border)',
                  borderRadius: 'var(--dispatch-radius)',
                  color: 'var(--dispatch-text-primary)',
                }}
              />
              <Bar
                dataKey="completed"
                name={labels.completed ?? 'Completed'}
                fill="var(--dispatch-chart-bar-throughput)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
