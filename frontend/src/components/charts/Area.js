import React from 'react';
import { cn } from '../../lib/utils';

const Area = ({
  data,
  dataKey,
  fill = 'var(--primary-color)',
  fillOpacity = 0.2,
  stroke = 'var(--primary-color)',
  strokeWidth = 2,
  className,
  ...props
}) => {
  if (!data || !data.length) return null;

  const width = props.width || 800;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };
  const totalWidth = width - margin.left - margin.right;
  const totalHeight = props.height - margin.top - margin.bottom;

  // Encontrar valores mínimo e máximo para escalar a área
  const values = data.map(item => item[dataKey] || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  // Gerar pontos para a área
  const points = data.map((item, index) => {
    const value = item[dataKey] || 0;
    const x = (index / (data.length - 1)) * totalWidth;
    const y = totalHeight - ((value - minValue) / valueRange) * totalHeight;
    return { x, y };
  });

  // Gerar o path da área
  const areaPath = points.reduce((path, point, index) => {
    return path + `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `;
  }, '') + `L ${points[points.length - 1].x} ${totalHeight} L ${points[0].x} ${totalHeight} Z`;

  return (
    <g className={cn('area', className)} {...props}>
      <path
        d={areaPath}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};

export default Area; 