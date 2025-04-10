import * as React from "react"
import { cn } from "@/lib/utils"

const AreaChart = React.forwardRef(({ className, data, margin = { top: 10, right: 10, left: 10, bottom: 20 }, ...props }, ref) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const { width, height } = dimensions
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Calcular escalas
  const xScale = (x) => {
    const xExtent = [0, data.length - 1]
    return margin.left + (x / (xExtent[1] - xExtent[0])) * innerWidth
  }

  const yScale = (y) => {
    const yExtent = [0, Math.max(...data.map(d => d.value))]
    return innerHeight + margin.top - (y / yExtent[1]) * innerHeight
  }

  // Gerar path para a área
  const generateAreaPath = () => {
    if (!data.length) return ""

    const points = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.value)
    }))

    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }
    path += ` L ${points[points.length - 1].x} ${innerHeight + margin.top}`
    path += ` L ${points[0].x} ${innerHeight + margin.top}`
    path += " Z"

    return path
  }

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)} {...props}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#2196F3" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <path
          d={generateAreaPath()}
          fill="url(#areaGradient)"
          stroke="#2196F3"
          strokeWidth={2}
        />
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={margin.left}
            y1={margin.top + (innerHeight / 4) * i}
            x2={width - margin.right}
            y2={margin.top + (innerHeight / 4) * i}
            stroke="#e5e7eb"
            strokeDasharray="3 3"
          />
        ))}
        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`x-label-${i}`}
            x={xScale(i)}
            y={height - margin.bottom / 2}
            textAnchor="middle"
            fontSize={12}
            fill="#6b7280"
            transform={`rotate(-30, ${xScale(i)}, ${height - margin.bottom / 2})`}
          >
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  )
})

AreaChart.displayName = "AreaChart"

export { AreaChart } 