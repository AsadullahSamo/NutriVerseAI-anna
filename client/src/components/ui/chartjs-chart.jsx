import * as React from "react"
import { cn } from "@/lib/utils"

// Chart.js components - more reliable than recharts
let ChartComponents = null

// Import Chart.js components
const loadChartJS = async () => {
  try {
    const [
      { Chart, registerables },
      { Line, Doughnut }
    ] = await Promise.all([
      import('chart.js'),
      import('react-chartjs-2')
    ])
    
    // Register Chart.js components
    Chart.register(...registerables)
    
    ChartComponents = { Line, Doughnut, Chart }
    console.log('[ChartJS] Chart.js loaded successfully')
    return ChartComponents
  } catch (error) {
    console.error('[ChartJS] Failed to load Chart.js:', error)
    throw error
  }
}

// Fallback components (same as before)
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

export function ChartJSLineChart({
  data,
  categories,
  index,
  colors = ["#2563eb", "#f59e0b", "#10b981"],
  valueFormatter,
  className
}) {
  const [isClient, setIsClient] = React.useState(false)
  const [chartReady, setChartReady] = React.useState(false)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    setIsClient(true)
    
    loadChartJS()
      .then(() => setChartReady(true))
      .catch(err => {
        console.error('[ChartJS] Failed to load Chart.js:', err)
        setError(err)
      })
  }, [])

  if (!isClient) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    )
  }

  if (error || !chartReady || !ChartComponents) {
    return <SimpleFallbackLineChart data={data} categories={categories} index={index} colors={colors} valueFormatter={valueFormatter} className={className} />
  }

  const { Line } = ChartComponents

  const chartData = {
    labels: data.map(item => item[index]),
    datasets: categories.map((category, idx) => ({
      label: category,
      data: data.map(item => item[category] || 0),
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length] + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.1
    }))
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: valueFormatter || ((value) => value)
        }
      }
    }
  }

  return (
    <div className={cn("h-[200px] w-full", className)}>
      <Line data={chartData} options={options} />
    </div>
  )
}

export function ChartJSPieChart({
  data,
  colors = ["#2563eb", "#f59e0b", "#10b981", "#3730a3", "#dc2626"],
  className
}) {
  const [isClient, setIsClient] = React.useState(false)
  const [chartReady, setChartReady] = React.useState(false)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    setIsClient(true)
    
    loadChartJS()
      .then(() => setChartReady(true))
      .catch(err => {
        console.error('[ChartJS] Failed to load Chart.js for PieChart:', err)
        setError(err)
      })
  }, [])

  if (!isClient) {
    return (
      <div className={cn("h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-lg", className)}>
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    )
  }

  if (error || !chartReady || !ChartComponents) {
    return <SimpleFallbackPieChart data={data} colors={colors} className={className} />
  }

  const { Doughnut } = ChartComponents

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [{
      data: data.map(item => item.value),
      backgroundColor: colors.slice(0, data.length),
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      }
    }
  }

  return (
    <div className={cn("h-[200px] w-full", className)}>
      <Doughnut data={chartData} options={options} />
    </div>
  )
}
