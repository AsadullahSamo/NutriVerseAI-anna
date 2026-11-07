import * as React from "react"
import { cn } from "@/lib/utils"

// Production-ready chart components with static imports
let RechartsComponents = null

// Try to import recharts at module level for better bundling
try {
  // Static import for better tree-shaking and bundling
  import('recharts').then(recharts => {
    RechartsComponents = recharts
    console.log('[ProductionChart] Recharts loaded at module level')
  }).catch(err => {
    console.warn('[ProductionChart] Module-level recharts import failed:', err)
  })
} catch (err) {
  console.warn('[ProductionChart] Static recharts import failed:', err)
}

// Fallback CSS-based charts
function SimpleFallbackLineChart({ data, categories, index, colors, valueFormatter, className }) {
  if (!data || data.length === 0) return null
  
  const maxValue = Math.max(...data.flatMap(item => 
    categories.map(cat => item[cat] || 0)
  ))

  return (
    <div className={cn("h-[200px] w-full p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border", className)}>
      <div className="h-full flex flex-col">
        <div className="flex gap-4 mb-3">
          {categories.map((category, idx) => (
            <div key={category} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
              <span className="text-xs font-medium text-gray-700">{category}</span>
            </div>
          ))}
        </div>
        
        <div className="flex-1 flex items-end justify-between gap-2">
          {data.slice(0, 8).map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="flex flex-col-reverse items-center gap-1 h-full w-full">
                {categories.map((category, catIdx) => {
                  const value = item[category] || 0
                  const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0
                  return (
                    <div
                      key={category}
                      className="w-full rounded-t-sm transition-all duration-500 hover:opacity-80"
                      style={{
                        backgroundColor: colors[catIdx % colors.length],
                        height: `${height}%`,
                        minHeight: value > 0 ? '3px' : '0px'
                      }}
                      title={`${category}: ${valueFormatter ? valueFormatter(value) : value}`}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-gray-600 mt-2 truncate w-full text-center font-medium">
                {String(item[index]).slice(0, 8)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SimpleFallbackPieChart({ data, colors, className }) {
  if (!data || data.length === 0) return null
  
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className={cn("h-[200px] w-full p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border", className)}>
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {data.map((item, idx) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0
                const circumference = 2 * Math.PI * 40
                const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`
                const strokeDashoffset = -data.slice(0, idx).reduce((sum, prevItem) => 
                  sum + (total > 0 ? (prevItem.value / total) * circumference : 0), 0
                )
                
                return (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={colors[idx % colors.length]}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                )
              })}
            </svg>
          </div>
          
          <div className="grid gap-2">
            {data.map((item, idx) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="text-sm font-medium text-gray-700">
                    {item.name} ({percentage}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductionLineChart(props) {
  const [isClient, setIsClient] = React.useState(false)
  const [rechartsReady, setRechartsReady] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
    
    // Check if recharts is available
    if (RechartsComponents) {
      setRechartsReady(true)
    } else {
      // Try one more time to load recharts
      import('recharts').then(recharts => {
        RechartsComponents = recharts
        setRechartsReady(true)
        console.log('[ProductionChart] Recharts loaded on demand')
      }).catch(err => {
        console.warn('[ProductionChart] Final recharts import failed, using fallback:', err)
        setRechartsReady(false)
      })
    }
  }, [])

  if (!isClient) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", props.className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    )
  }

  // Use recharts if available
  if (rechartsReady && RechartsComponents) {
    try {
      const { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } = RechartsComponents
      
      return (
        <div className={cn("h-[200px] w-full", props.className)}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={props.data}>
              <XAxis dataKey={props.index} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={props.valueFormatter} />
              <Tooltip formatter={props.valueFormatter} />
              <Legend />
              {props.categories.map((category, idx) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={props.colors[idx % props.colors.length]}
                  strokeWidth={2}
                  dot={{ fill: props.colors[idx % props.colors.length], strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    } catch (error) {
      console.error('[ProductionChart] Recharts rendering failed:', error)
    }
  }

  // Fallback to CSS-based chart
  return <SimpleFallbackLineChart {...props} />
}

export function ProductionPieChart(props) {
  const [isClient, setIsClient] = React.useState(false)
  const [rechartsReady, setRechartsReady] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
    
    if (RechartsComponents) {
      setRechartsReady(true)
    } else {
      import('recharts').then(recharts => {
        RechartsComponents = recharts
        setRechartsReady(true)
        console.log('[ProductionChart] Recharts loaded for PieChart')
      }).catch(err => {
        console.warn('[ProductionChart] PieChart recharts import failed, using fallback:', err)
        setRechartsReady(false)
      })
    }
  }, [])

  if (!isClient) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", props.className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    )
  }

  // Use recharts if available
  if (rechartsReady && RechartsComponents) {
    try {
      const { PieChart, Pie, ResponsiveContainer, Tooltip, Legend, Cell } = RechartsComponents
      
      return (
        <div className={cn("h-[200px] w-full", props.className)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={props.data}
                cx="50%"
                cy="50%"
                outerRadius={60}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {props.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={props.colors[index % props.colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    } catch (error) {
      console.error('[ProductionChart] PieChart rendering failed:', error)
    }
  }

  // Fallback to CSS-based chart
  return <SimpleFallbackPieChart {...props} />
}
