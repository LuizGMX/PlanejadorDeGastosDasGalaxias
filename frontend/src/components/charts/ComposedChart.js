import React from 'react';
import { cn } from '../../lib/utils';

const ComposedChart = ({
  data,
  width = '100%',
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  strokeWidth = 2,
  barWidth = 20,
  fillOpacity = 0.3,
  className,
  ...props
}) => {
  const totalHeight = height - margin.top - margin.bottom;
  const totalWidth = width - margin.left - margin.right;
  
  // Encontrar valores máximos e mínimos para cada tipo de dado
  const maxValues = {};
  const minValues = {};
  
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'name') {
        maxValues[key] = Math.max(maxValues[key] || -Infinity, item[key]);
        minValues[key] = Math.min(minValues[key] || Infinity, item[key]);
      }
    });
  });

  const getX = (index) => {
    return (index / (data.length - 1)) * totalWidth + margin.left;
  };

  const getY = (value, key) => {
    const range = maxValues[key] - minValues[key];
    return totalHeight - ((value - minValues[key]) / range) * totalHeight + margin.top;
  };

  const renderLine = (key, color) => {
    const points = data.map((item, index) => ({
      x: getX(index),
      y: getY(item[key], key)
    }));

    const path = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return (
      <g key={key}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={color}
            className="transition-all duration-300 hover:r-6"
          />
        ))}
      </g>
    );
  };

  const renderBar = (key, color) => {
    return data.map((item, index) => {
      const x = getX(index) - barWidth / 2;
      const y = getY(item[key], key);
      const height = totalHeight + margin.top - y;

      return (
        <rect
          key={index}
          x={x}
          y={y}
          width={barWidth}
          height={height}
          fill={color}
          className="transition-all duration-300 hover:opacity-80"
        />
      );
    });
  };

  const renderArea = (key, color) => {
    const points = data.map((item, index) => ({
      x: getX(index),
      y: getY(item[key], key)
    }));

    const path = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    const areaPath = `${path} L ${points[points.length - 1].x} ${totalHeight + margin.top} L ${points[0].x} ${totalHeight + margin.top} Z`;

    return (
      <g key={key}>
        <path
          d={areaPath}
          fill={color}
          fillOpacity={fillOpacity}
          className="transition-all duration-300"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
      </g>
    );
  };

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
        {/* Renderizar diferentes tipos de gráficos */}
        {Object.keys(maxValues).map((key, index) => {
          const color = `hsl(${(index * 360) / Object.keys(maxValues).length}, 70%, 50%)`;
          
          switch (props.types?.[key]) {
            case 'bar':
              return renderBar(key, color);
            case 'area':
              return renderArea(key, color);
            default:
              return renderLine(key, color);
          }
        })}
      </svg>
    </div>
  );
};

export default ComposedChart; 