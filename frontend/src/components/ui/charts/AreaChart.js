import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const AreaChart = ({
  data,
  xAxis,
  yAxis,
  series,
  height = 350,
  className,
  ...props
}) => {
  return (
    <Card className={cn("p-4", className)} {...props}>
      <div className="h-[350px] w-full">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {yAxis.ticks.map((tick) => (
            <line
              key={tick}
              x1={0}
              y1={height - (tick / yAxis.max) * height}
              x2={width}
              y2={height - (tick / yAxis.max) * height}
              stroke="var(--border-color)"
              strokeDasharray="3 3"
              strokeOpacity={0.2}
            />
          ))}

          {/* X-axis */}
          <line
            x1={0}
            y1={height}
            x2={width}
            y2={height}
            stroke="var(--border-color)"
            strokeWidth={1}
          />

          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={height}
            stroke="var(--border-color)"
            strokeWidth={1}
          />

          {/* Area path */}
          <path
            d={series.path}
            fill="url(#area-gradient)"
            fillOpacity={0.2}
            stroke={series.color}
            strokeWidth={2}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={series.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={series.color} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* X-axis labels */}
          {xAxis.ticks.map((tick, index) => (
            <text
              key={tick}
              x={(index / (xAxis.ticks.length - 1)) * width}
              y={height + 20}
              textAnchor="middle"
              fill="var(--text-color)"
              fontSize={12}
            >
              {tick}
            </text>
          ))}

          {/* Y-axis labels */}
          {yAxis.ticks.map((tick) => (
            <text
              key={tick}
              x={-10}
              y={height - (tick / yAxis.max) * height}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-color)"
              fontSize={12}
            >
              {yAxis.formatter(tick)}
            </text>
          ))}
        </svg>
      </div>
    </Card>
  );
};

export default AreaChart; 