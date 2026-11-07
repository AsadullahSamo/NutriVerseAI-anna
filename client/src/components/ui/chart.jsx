import * as React from "react"
import { cn } from "@/lib/utils"
import { FallbackLineChart, FallbackPieChart } from "./fallback-chart"

// Simple client-side check
function useIsClient() {
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

// Production-ready chart component with better error handling
export function LineChart({
  data,
  categories,
  index,
  colors = ["#2563eb", "#f59e0b", "#10b981"],
  valueFormatter,
  className
}) {
  const isClient = useIsClient()
  const [RechartsComponents, setRechartsComponents] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (isClient) {
      setLoading(true)
      // Use a more robust import strategy
      const loadRecharts = async () => {
        try {
          // Try multiple import strategies for better compatibility
          let recharts
          try {
            recharts = await import('recharts')
          } catch (firstError) {
            console.warn('[Chart] First import attempt failed, trying alternative:', firstError)
            // Fallback import strategy
            recharts = await import('recharts/es6')
          }

          console.log('[Chart] Recharts loaded successfully:', Object.keys(recharts))
          setRechartsComponents(recharts)
          setError(null)
        } catch (err) {
          console.error('[Chart] All recharts import attempts failed:', err)
          setError(err)
        } finally {
          setLoading(false)
        }
      }

      loadRecharts()
    }
  }, [isClient])

  if (!isClient || loading) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">
          {!isClient ? "Initializing chart..." : "Loading chart library..."}
        </div>
      </div>
    )
  }

  if (error) {
    console.log('[Chart] Using fallback chart due to recharts error:', error)
    return (
      <div className="space-y-2">
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Using fallback chart (recharts unavailable)
        </div>
        <FallbackLineChart
          data={data}
          categories={categories}
          index={index}
          colors={colors}
          valueFormatter={valueFormatter}
          className={className}
        />
      </div>
    )
  }

  if (!RechartsComponents) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Preparing chart...</div>
      </div>
    )
  }

  try {
    const { LineChart: RechartsLineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } = RechartsComponents

    return (
      <div className={cn("h-[200px] w-full", className)}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={data}>
            <XAxis
              dataKey={index}
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#374151' }}
              tickFormatter={valueFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={valueFormatter}
            />
            <Legend />
            {categories.map((category, idx) => (
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[idx % colors.length], strokeWidth: 2, r: 4 }}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    )
  } catch (renderError) {
    console.error('[Chart] Error rendering chart:', renderError)
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed", className)}>
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">Chart render error</div>
          <div className="text-xs text-muted-foreground">Data: {data?.length || 0} points</div>
        </div>
      </div>
    )
  }
}

export function PieChart({
  data,
  colors = ["#2563eb", "#f59e0b", "#10b981", "#3730a3", "#dc2626"],
  className
}) {
  const isClient = useIsClient()
  const [RechartsComponents, setRechartsComponents] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (isClient) {
      setLoading(true)
      const loadRecharts = async () => {
        try {
          let recharts
          try {
            recharts = await import('recharts')
          } catch (firstError) {
            console.warn('[PieChart] First import attempt failed, trying alternative:', firstError)
            recharts = await import('recharts/es6')
          }

          console.log('[PieChart] Recharts loaded successfully:', Object.keys(recharts))
          setRechartsComponents(recharts)
          setError(null)
        } catch (err) {
          console.error('[PieChart] All recharts import attempts failed:', err)
          setError(err)
        } finally {
          setLoading(false)
        }
      }

      loadRecharts()
    }
  }, [isClient])

  if (!isClient || loading) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">
          {!isClient ? "Initializing chart..." : "Loading chart library..."}
        </div>
      </div>
    )
  }

  if (error) {
    console.log('[PieChart] Using fallback chart due to recharts error:', error)
    return (
      <div className="space-y-2">
        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Using fallback chart (recharts unavailable)
        </div>
        <FallbackPieChart
          data={data}
          colors={colors}
          className={className}
        />
      </div>
    )
  }

  if (!RechartsComponents) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Preparing chart...</div>
      </div>
    )
  }

  const { PieChart: RechartsPieChart, Pie, ResponsiveContainer, Tooltip, Legend, Cell } = RechartsComponents

  return (
    <div className={cn("h-[200px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={60}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
