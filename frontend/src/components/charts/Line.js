import React from 'react';
import { cn } from '../../lib/utils';

const Line = ({
  data,
  dataKey,
  stroke = 'var(--primary-color)',
  strokeWidth = 2,
  dot = true,
  dotSize = 4,
  dotFill = 'var(--primary-color)',
  dotStroke = 'var(--background-color)',
  dotStrokeWidth = 1,
  className,
  ...props
}) => {
  if (!data || !data.length) return null;

  const width = props.width || 800;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };
  const totalWidth = width - margin.left - margin.right;
  const totalHeight = props.height - margin.top - margin.bottom;

  // Encontrar valores mínimo e máximo para escalar a linha
  const values = data.map(item => item[dataKey] || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  // Gerar pontos para a linha
  const points = data.map((item, index) => {
    const value = item[dataKey] || 0;
    const x = (index / (data.length - 1)) * totalWidth;
    const y = totalHeight - ((value - minValue) / valueRange) * totalHeight;
    return { x, y, value };
  });

  // Gerar o path da linha
  const linePath = points.reduce((path, point, index) => {
    return path + `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
  }, '');

  return (
    <g className={cn('line', className)} {...props}>
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {dot && points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={dotSize}
          fill={dotFill}
          stroke={dotStroke}
          strokeWidth={dotStrokeWidth}
        />
      ))}
    </g>
  );
};

export default Line; 