import React from 'react';
import { cn } from '../../lib/utils';

const YAxis = ({
  tickFormatter = (value) => value,
  width = 60,
  tickMargin = 5,
  className,
  ...props
}) => {
  const ticks = props.ticks || [];
  const height = props.height || 300;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };
  const totalHeight = height - margin.top - margin.bottom;

  return (
    <g className={cn('y-axis', className)} transform={`translate(${margin.left},${margin.top})`} {...props}>
      {/* Linha do eixo */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={totalHeight}
        stroke="var(--border-color)"
        strokeWidth={1}
      />
      
      {/* Ticks e labels */}
      {ticks.map((tick, index) => {
        const y = totalHeight - (index / (ticks.length - 1)) * totalHeight;
        const formattedValue = tickFormatter(tick);
        
        return (
          <g key={`tick-${index}`} transform={`translate(0,${y})`}>
            {/* Tick mark */}
            <line
              x1={-5}
              y1={0}
              x2={0}
              y2={0}
              stroke="var(--border-color)"
              strokeWidth={1}
            />
            
            {/* Label */}
            <text
              x={-tickMargin - 5}
              y={0}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-color)"
              fontSize={12}
            >
              {formattedValue}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default YAxis; 