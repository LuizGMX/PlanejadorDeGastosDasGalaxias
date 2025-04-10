import React from 'react';
import { cn } from '../../lib/utils';

const PieChart = ({
  data,
  width = '100%',
  height = 300,
  margin = { top: 10, right: 10, left: 10, bottom: 10 },
  innerRadius = 0,
  outerRadius = 80,
  paddingAngle = 0,
  className,
  ...props
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;

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
        <g transform={`translate(${width/2},${height/2})`}>
          {data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const x1 = Math.cos((startAngle * Math.PI) / 180) * outerRadius;
            const y1 = Math.sin((startAngle * Math.PI) / 180) * outerRadius;
            const x2 = Math.cos(((startAngle + angle) * Math.PI) / 180) * outerRadius;
            const y2 = Math.sin(((startAngle + angle) * Math.PI) / 180) * outerRadius;
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const path = [
              `M ${x1} ${y1}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L 0 0`,
              'Z'
            ].join(' ');

            startAngle += angle;

            return (
              <path
                key={index}
                d={path}
                fill={item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
          {innerRadius > 0 && (
            <circle
              cx="0"
              cy="0"
              r={innerRadius}
              fill="white"
              className="shadow-sm"
            />
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {total}
          </div>
          <div className="text-sm text-gray-500">
            Total
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart; 