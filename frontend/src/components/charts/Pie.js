import React from 'react';
import { cn } from '../../lib/utils';

const Pie = ({
  data,
  dataKey,
  nameKey,
  cx,
  cy,
  innerRadius = 0,
  outerRadius = 100,
  fill = 'var(--primary-color)',
  stroke = 'var(--primary-color)',
  strokeWidth = 1,
  className,
  children,
  ...props
}) => {
  if (!data || !data.length) return null;

  const total = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0);
  let startAngle = 0;

  return (
    <g className={cn('pie', className)} transform={`translate(${cx},${cy})`} {...props}>
      {data.map((item, index) => {
        const value = item[dataKey] || 0;
        const percentage = value / total;
        const endAngle = startAngle + percentage * Math.PI * 2;

        const pathData = [
          `M ${Math.cos(startAngle) * outerRadius} ${Math.sin(startAngle) * outerRadius}`,
          `A ${outerRadius} ${outerRadius} 0 ${percentage > 0.5 ? 1 : 0} 1 ${Math.cos(endAngle) * outerRadius} ${Math.sin(endAngle) * outerRadius}`,
          `L ${Math.cos(endAngle) * innerRadius} ${Math.sin(endAngle) * innerRadius}`,
          `A ${innerRadius} ${innerRadius} 0 ${percentage > 0.5 ? 1 : 0} 0 ${Math.cos(startAngle) * innerRadius} ${Math.sin(startAngle) * innerRadius}`,
          'Z'
        ].join(' ');

        const slice = (
          <path
            key={`slice-${index}`}
            d={pathData}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

        startAngle = endAngle;

        return React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              ...child.props,
              data: item,
              index,
              slice
            });
          }
          return slice;
        });
      })}
    </g>
  );
};

export default Pie; 