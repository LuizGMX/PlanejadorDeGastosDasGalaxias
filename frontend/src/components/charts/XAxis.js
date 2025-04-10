import React from 'react';
import { cn } from '../../lib/utils';

const XAxis = ({
  dataKey,
  tickFormatter = (value) => value,
  angle = 0,
  textAnchor = 'middle',
  height = 30,
  interval = 'preserveStartEnd',
  tickMargin = 10,
  className,
  ...props
}) => {
  const ticks = props.ticks || [];
  const width = props.width || 800;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };
  const totalWidth = width - margin.left - margin.right;

  // Filtrar ticks com base no intervalo
  let filteredTicks = [...ticks];
  if (interval === 'preserveStartEnd') {
    if (ticks.length > 2) {
      filteredTicks = [ticks[0], ...ticks.slice(1, -1).filter((_, i) => i % 2 === 0), ticks[ticks.length - 1]];
    }
  } else if (typeof interval === 'number') {
    filteredTicks = ticks.filter((_, i) => i % interval === 0);
  }

  return (
    <g className={cn('x-axis', className)} transform={`translate(${margin.left},${height - margin.bottom})`} {...props}>
      {/* Linha do eixo */}
      <line
        x1={0}
        y1={0}
        x2={totalWidth}
        y2={0}
        stroke="var(--border-color)"
        strokeWidth={1}
      />
      
      {/* Ticks e labels */}
      {filteredTicks.map((tick, index) => {
        const x = (index / (filteredTicks.length - 1)) * totalWidth;
        const formattedValue = tickFormatter(tick);
        
        return (
          <g key={`tick-${index}`} transform={`translate(${x},0)`}>
            {/* Tick mark */}
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={5}
              stroke="var(--border-color)"
              strokeWidth={1}
            />
            
            {/* Label */}
            <text
              x={0}
              y={tickMargin + 5}
              textAnchor={textAnchor}
              fill="var(--text-color)"
              fontSize={12}
              transform={angle !== 0 ? `rotate(${angle},0,${tickMargin + 5})` : ''}
            >
              {formattedValue}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export default XAxis; 