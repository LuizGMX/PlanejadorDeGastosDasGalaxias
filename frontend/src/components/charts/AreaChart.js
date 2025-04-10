import React from 'react';
import { cn } from '../../lib/utils';

const AreaChart = ({
  data,
  width = '100%',
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  strokeWidth = 2,
  fillOpacity = 0.3,
  className,
  ...props
}) => {
  const totalHeight = height - margin.top - margin.bottom;
  const totalWidth = width - margin.left - margin.right;
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const valueRange = maxValue - minValue;

  const getX = (index) => {
    return (index / (data.length - 1)) * totalWidth + margin.left;
  };

  const getY = (value) => {
    return totalHeight - ((value - minValue) / valueRange) * totalHeight + margin.top;
  };

  const points = data.map((item, index) => ({
    x: getX(index),
    y: getY(item.value)
  }));

  const path = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  const areaPath = `${path} L ${points[points.length - 1].x} ${totalHeight + margin.top} L ${points[0].x} ${totalHeight + margin.top} Z`;

  return (
    <div 
      className={cn(
        'relative w-full overflow-hidden',
        className
      )}
      style={{ height }}
      {...props}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Área preenchida */}
        <path
          d={areaPath}
          fill="var(--primary-color)"
          fillOpacity={fillOpacity}
          className="transition-all duration-300"
        />
        
        {/* Linha do gráfico */}
        <path
          d={path}
          fill="none"
          stroke="var(--primary-color)"
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
        
        {/* Pontos do gráfico */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="var(--primary-color)"
            className="transition-all duration-300 hover:r-6"
          />
        ))}
      </svg>
    </div>
  );
};

export default AreaChart; 