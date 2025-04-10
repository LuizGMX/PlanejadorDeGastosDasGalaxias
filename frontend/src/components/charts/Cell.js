import React from 'react';
import { cn } from '../../lib/utils';

const Cell = ({
  fill = 'var(--primary-color)',
  stroke = 'var(--primary-color)',
  strokeWidth = 1,
  className,
  ...props
}) => {
  return (
    <g className={cn('cell', className)} {...props}>
      <rect
        width={props.width || 10}
        height={props.height || 10}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </g>
  );
};

export default Cell; 