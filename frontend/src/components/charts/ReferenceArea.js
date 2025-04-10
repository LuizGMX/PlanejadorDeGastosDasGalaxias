import React from 'react';
import { cn } from '../../lib/utils';

const ReferenceArea = ({
  x1,
  x2,
  y1,
  y2,
  fill = 'var(--primary-color)',
  fillOpacity = 0.1,
  stroke = 'var(--primary-color)',
  strokeWidth = 1,
  className,
  ...props
}) => {
  const width = props.width || 800;
  const height = props.height || 300;
  const margin = props.margin || { top: 20, right: 30, left: 20, bottom: 5 };

  return (
    <g className={cn('reference-area', className)}>
      <rect
        x={x1}
        y={y1}
        width={x2 - x1}
        height={y2 - y1}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};

export default ReferenceArea; 