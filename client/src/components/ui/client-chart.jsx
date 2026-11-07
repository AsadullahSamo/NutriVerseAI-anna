import React, { useState, useEffect } from 'react'

// Client-side only chart wrapper to prevent SSR issues
export function ClientChart({ children, fallback = null, className = "" }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return fallback || (
      <div className={`h-[200px] w-full flex items-center justify-center ${className}`}>
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    )
  }

  return <>{children}</>
}

// Lazy load recharts components
const LazyLineChart = React.lazy(() => 
  import('recharts').then(module => ({
    default: ({ data, categories, index, colors = ["#2563eb", "#f59e0b", "#10b981"], valueFormatter, className }) => {
      const { LineChart: RechartsLineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } = module
      
      return (
        <div className={`h-[200px] w-full ${className || ''}`}>
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
    }
  }))
)

const LazyPieChart = React.lazy(() => 
  import('recharts').then(module => ({
    default: ({ data, colors = ["#2563eb", "#f59e0b", "#10b981", "#3730a3", "#dc2626"], className }) => {
      const { PieChart: RechartsPieChart, Pie, ResponsiveContainer, Tooltip, Legend, Cell } = module
      
      return (
        <div className={`h-[200px] w-full ${className || ''}`}>
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
  }))
)

export function LineChart(props) {
  return (
    <ClientChart className={props.className}>
      <React.Suspense fallback={
        <div className={`h-[200px] w-full flex items-center justify-center ${props.className || ''}`}>
          <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
        </div>
      }>
        <LazyLineChart {...props} />
      </React.Suspense>
    </ClientChart>
  )
}

export function PieChart(props) {
  return (
    <ClientChart className={props.className}>
      <React.Suspense fallback={
        <div className={`h-[200px] w-full flex items-center justify-center ${props.className || ''}`}>
          <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
        </div>
      }>
        <LazyPieChart {...props} />
      </React.Suspense>
    </ClientChart>
  )
}
