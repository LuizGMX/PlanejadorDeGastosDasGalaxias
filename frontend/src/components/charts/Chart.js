import React from 'react';
import { cn } from '../../lib/utils';

const Chart = ({
  width = 800,
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  className,
  children,
  ...props
}) => {
  const totalWidth = width - margin.left - margin.right;
  const totalHeight = height - margin.top - margin.bottom;

  return (
    <svg
      width={width}
      height={height}
      className={cn('chart', className)}
      {...props}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              width: totalWidth,
              height: totalHeight,
              margin
            });
          }
          return child;
        })}
      </g>
    </svg>
  );
};

export default Chart; 