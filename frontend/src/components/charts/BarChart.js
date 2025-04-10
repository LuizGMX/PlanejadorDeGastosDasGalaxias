import React from 'react';
import { cn } from '../../lib/utils';

const BarChart = ({
  data,
  width = '100%',
  height = 300,
  margin = { top: 20, right: 30, left: 20, bottom: 5 },
  barSize = 20,
  barGap = 8,
  barCategoryGap = 35,
  maxBarSize = 50,
  className,
  ...props
}) => {
  const totalHeight = height - margin.top - margin.bottom;
  const totalWidth = width - margin.left - margin.right;
  const maxValue = Math.max(...data.map(item => item.value));
  const barHeight = Math.min(barSize, maxBarSize);

  return (
    <div 
      className={cn(
        'relative w-full overflow-hidden',
        className
      )}
      style={{ height }}
      {...props}
    >
      <div className="absolute inset-0 flex flex-col justify-between px-4">
        {data.map((item, index) => {
          const barWidth = (item.value / maxValue) * totalWidth;
          return (
            <div
              key={index}
              className="flex items-center gap-2"
              style={{ height: barHeight }}
            >
              <div className="text-sm text-gray-500 min-w-[100px]">
                {item.name}
              </div>
              <div 
                className="bg-primary rounded-md transition-all duration-300"
                style={{ 
                  width: `${barWidth}px`,
                  height: barHeight
                }}
              />
              <div className="text-sm font-medium">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart; 