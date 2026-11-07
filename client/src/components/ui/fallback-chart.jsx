import * as React from "react"
import { cn } from "@/lib/utils"

// CSS-based fallback chart components for when recharts fails to load
export function FallbackLineChart({
  data,
  categories,
  index,
  colors = ["#2563eb", "#f59e0b", "#10b981"],
  valueFormatter = (value) => value,
  className
}) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    )
  }

  // Calculate max value for scaling
  const maxValue = Math.max(...data.flatMap(item => 
    categories.map(cat => item[cat] || 0)
  ))

  return (
    <div className={cn("h-[200px] w-full p-4 bg-muted/20 rounded-lg", className)}>
      <div className="h-full flex flex-col">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {categories.map((category, idx) => (
            <div key={category} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              <span className="text-xs text-muted-foreground">{category}</span>
            </div>
          ))}
        </div>
        
        {/* Simple bar chart representation */}
        <div className="flex-1 flex items-end justify-between gap-1">
          {data.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div className="flex flex-col-reverse items-center gap-1 h-full">
                {categories.map((category, catIdx) => {
                  const value = item[category] || 0
                  const height = maxValue > 0 ? (value / maxValue) * 100 : 0
                  return (
                    <div
                      key={category}
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        backgroundColor: colors[catIdx % colors.length],
                        height: `${height}%`,
                        minHeight: value > 0 ? '2px' : '0px'
                      }}
                      title={`${category}: ${valueFormatter(value)}`}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                {item[index]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FallbackPieChart({
  data,
  colors = ["#2563eb", "#f59e0b", "#10b981", "#3730a3", "#dc2626"],
  className
}) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0)

  return (
    <div className={cn("h-[200px] w-full p-4 bg-muted/20 rounded-lg", className)}>
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Simple circular representation */}
          <div className="relative w-24 h-24">
            <div className="w-full h-full rounded-full border-8 border-muted" />
            {data.map((item, idx) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0
              return (
                <div
                  key={idx}
                  className="absolute inset-0 rounded-full border-4"
                  style={{
                    borderColor: colors[idx % colors.length],
                    borderTopColor: 'transparent',
                    borderRightColor: percentage > 25 ? colors[idx % colors.length] : 'transparent',
                    borderBottomColor: percentage > 50 ? colors[idx % colors.length] : 'transparent',
                    borderLeftColor: percentage > 75 ? colors[idx % colors.length] : 'transparent',
                    transform: `rotate(${idx * (360 / data.length)}deg)`
                  }}
                />
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.map((item, idx) => {
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <span className="text-muted-foreground">
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
