import React from 'react';
import { cn } from '../../lib/utils';

const CartesianGrid = ({
  width = '100%',
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  strokeDasharray = '3 3',
  vertical = true,
  horizontal = true,
  className,
  ...props
}) => {
  const totalHeight = height - margin.top - margin.bottom;
  const totalWidth = width - margin.left - margin.right;

  // Linhas horizontais
  const horizontalLines = [];
  if (horizontal) {
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const y = margin.top + (i / numLines) * totalHeight;
      horizontalLines.push(
        <line
          key={`h-${i}`}
          x1={margin.left}
          y1={y}
          x2={margin.left + totalWidth}
          y2={y}
          stroke="var(--border-color)"
          strokeDasharray={strokeDasharray}
          strokeOpacity={0.2}
        />
      );
    }
  }

  // Linhas verticais
  const verticalLines = [];
  if (vertical) {
    const numLines = 5;
    for (let i = 0; i <= numLines; i++) {
      const x = margin.left + (i / numLines) * totalWidth;
      verticalLines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={margin.top}
          x2={x}
          y2={margin.top + totalHeight}
          stroke="var(--border-color)"
          strokeDasharray={strokeDasharray}
          strokeOpacity={0.2}
        />
      );
    }
  }

  return (
    <g className={cn('cartesian-grid', className)} {...props}>
      {horizontalLines}
      {verticalLines}
    </g>
  );
};

export default CartesianGrid; 