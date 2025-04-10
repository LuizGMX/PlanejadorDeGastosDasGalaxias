"use client"

import React from 'react';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { useTooltip, Tooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { cn } from '@/lib/utils';

const PieChart = ({
  data,
  width = 400,
  height = 400,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  valueAccessor = d => d.value,
  labelAccessor = d => d.label,
  colorAccessor = d => d.color,
  className,
  ...props
}) => {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = useTooltip();

  // Dimensions
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerX = innerWidth / 2;
  const centerY = innerHeight / 2;

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + valueAccessor(d), 0);

  // Tooltip handler
  const handleTooltip = (event, d) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    showTooltip({
      tooltipData: d,
      tooltipLeft: x,
      tooltipTop: y,
    });
  };

  return (
    <div className={cn('relative', className)} {...props}>
      <svg width={width} height={height}>
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={data}
            pieValue={valueAccessor}
            outerRadius={radius}
            innerRadius={radius * 0.6}
          >
            {pie => {
              return pie.arcs.map((arc, i) => {
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const percentage = ((valueAccessor(arc.data) / total) * 100).toFixed(1);
                const label = labelAccessor(arc.data);

                return (
                  <g key={`arc-${i}`}>
                    <path
                      d={pie.path(arc)}
                      fill={colorAccessor(arc.data)}
                      onMouseMove={(event) => handleTooltip(event, arc.data)}
                      onMouseLeave={hideTooltip}
                    />
                    {percentage > 5 && (
                      <text
                        x={centroidX}
                        y={centroidY}
                        dy=".33em"
                        fill="white"
                        fontSize={12}
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        {percentage}%
                      </text>
                    )}
                  </g>
                );
              });
            }}
          </Pie>
        </Group>
      </svg>
      {tooltipData && (
        <Tooltip
          top={tooltipTop}
          left={tooltipLeft}
          style={{
            backgroundColor: 'white',
            color: 'black',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div>
            <strong>{labelAccessor(tooltipData)}</strong>
          </div>
          <div>
            Valor: {valueAccessor(tooltipData)}
          </div>
          <div>
            {((valueAccessor(tooltipData) / total) * 100).toFixed(1)}%
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default PieChart; 