import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

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

export function QueueChart({
  queueData,
  throughputData,
  emptyMessage = 'No data available',
  labels = {},
}: QueueChartProps) {
  if (queueData.length === 0) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={queueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                color: 'var(--color-popover-foreground)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pending"
              name={labels.pending ?? 'Pending'}
              stroke="var(--color-status-pending)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="running"
              name={labels.running ?? 'Running'}
              stroke="var(--color-status-running)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {throughputData && throughputData.length > 0 && (
        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer>
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: 'var(--color-popover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--color-popover-foreground)',
                }}
              />
              <Bar
                dataKey="completed"
                name={labels.completed ?? 'Completed'}
                fill="var(--color-status-done)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
