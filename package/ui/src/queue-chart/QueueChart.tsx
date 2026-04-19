import {
  AreaChart,
  Area,
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-60 items-center justify-center">
      <div className="relative flex flex-col items-center gap-3">
        <div className="flex gap-1" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <span
              key={i}
              className="block h-6 w-1 bg-current opacity-20"
              style={{
                color: 'var(--color-muted-foreground)',
                animation: `sweep 2.4s ease-in-out ${i * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {message}
        </div>
      </div>
    </div>
  )
}

export function QueueChart({
  queueData,
  throughputData,
  emptyMessage = 'No data available',
  labels = {},
}: QueueChartProps) {
  if (queueData.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  const tooltipStyle = {
    background: 'var(--color-popover)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-popover-foreground)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    padding: '8px 10px',
  }

  return (
    <div className="text-card-foreground">
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={queueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradient-pending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-status-pending)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-status-pending)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradient-running" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-status-running)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-status-running)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="2 4"
              vertical={false}
              opacity={0.7}
            />
            <XAxis
              dataKey="time"
              stroke="var(--color-muted-foreground)"
              fontSize={10}
              tick={{ fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={10}
              tick={{ fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--color-border)', strokeDasharray: '2 4' }} />
            <Legend
              wrapperStyle={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                paddingTop: '8px',
              }}
              iconType="square"
            />
            <Area
              type="monotone"
              dataKey="pending"
              name={labels.pending ?? 'Pending'}
              stroke="var(--color-status-pending)"
              strokeWidth={1.5}
              fill="url(#gradient-pending)"
              isAnimationActive
            />
            <Area
              type="monotone"
              dataKey="running"
              name={labels.running ?? 'Running'}
              stroke="var(--color-status-running)"
              strokeWidth={1.5}
              fill="url(#gradient-running)"
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {throughputData && throughputData.length > 0 && (
        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer>
            <BarChart data={throughputData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke="var(--color-border)"
                strokeDasharray="2 4"
                vertical={false}
                opacity={0.7}
              />
              <XAxis
                dataKey="time"
                stroke="var(--color-muted-foreground)"
                fontSize={10}
                tick={{ fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={10}
                tick={{ fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-accent)', opacity: 0.3 }} />
              <Bar
                dataKey="completed"
                name={labels.completed ?? 'Completed'}
                fill="var(--color-status-done)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
