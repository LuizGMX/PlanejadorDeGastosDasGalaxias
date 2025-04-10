import React from 'react';
import { cn } from '../../lib/utils';

const Bar = ({
  data,
  dataKey,
  fill = 'var(--primary-color)',
  stroke = 'var(--primary-color)',
  strokeWidth = 1,
  barSize = 20,
  className,
  ...props
}) => {
  if (!data || !data.length) return null;

  const width = props.width || 800;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };
  const totalWidth = width - margin.left - margin.right;
  const totalHeight = props.height - margin.top - margin.bottom;

  // Encontrar valores mínimo e máximo para escalar as barras
  const values = data.map(item => item[dataKey] || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  // Calcular largura e espaçamento das barras
  const barWidth = Math.min(barSize, totalWidth / data.length - 4);
  const barSpacing = (totalWidth - (barWidth * data.length)) / (data.length - 1);

  return (
    <g className={cn('bar', className)} {...props}>
      {data.map((item, index) => {
        const value = item[dataKey] || 0;
        const x = index * (barWidth + barSpacing);
        const height = ((value - minValue) / valueRange) * totalHeight;
        const y = totalHeight - height;

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      })}
    </g>
  );
};

export default Bar; 