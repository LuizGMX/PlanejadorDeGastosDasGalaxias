import React from 'react';
import { cn } from '../../lib/utils';

const ReferenceLine = ({
  x,
  y,
  stroke = '#666',
  strokeDasharray = '5,5',
  label,
  className,
  ...props
}) => {
  return (
    <g className={cn('reference-line', className)}>
      <line
        x1={x}
        y1={props.y1}
        x2={x}
        y2={props.y2}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
      />
      {label && (
        <text
          x={x}
          y={props.y1 - 5}
          textAnchor="middle"
          fill={stroke}
          className="text-xs"
        >
          {label}
        </text>
      )}
    </g>
  );
};

export default ReferenceLine; 