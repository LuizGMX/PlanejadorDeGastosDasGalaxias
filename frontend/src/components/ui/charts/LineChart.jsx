"use client"

import React from 'react';
import { LinePath } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, Tooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { cn } from '@/lib/utils';

const LineChart = ({
  data,
  width = 600,
  height = 400,
  margin = { top: 20, right: 20, bottom: 50, left: 50 },
  xAccessor = d => d.x,
  yAccessor = d => d.y,
  xScale: propXScale = scaleTime,
  yScale: propYScale = scaleLinear,
  stroke = "var(--primary)",
  strokeWidth = 2,
  className,
  ...props
}) => {
  const { showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = useTooltip();

  // Dimensions
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = propXScale()
    .domain([Math.min(...data.map(xAccessor)), Math.max(...data.map(xAccessor))])
    .range([0, innerWidth]);

  const yScale = propYScale()
    .domain([Math.min(...data.map(yAccessor)), Math.max(...data.map(yAccessor))])
    .range([innerHeight, 0])
    .nice();

  // Tooltip handler
  const handleTooltip = (event) => {
    const { x, y } = localPoint(event) || { x: 0, y: 0 };
    const x0 = xScale.invert(x - margin.left);
    
    // Find closest data point
    let closestPoint = data[0];
    let minDistance = Math.abs(xAccessor(data[0]) - x0);
    
    for (const point of data) {
      const distance = Math.abs(xAccessor(point) - x0);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    showTooltip({
      tooltipData: closestPoint,
      tooltipLeft: x,
      tooltipTop: y,
    });
  };

  return (
    <div className={cn('relative', className)} {...props}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            height={innerHeight}
            stroke="#e0e0e0"
            strokeOpacity={0.2}
          />
          <GridColumns
            scale={xScale}
            width={innerWidth}
            height={innerHeight}
            stroke="#e0e0e0"
            strokeOpacity={0.2}
          />
          <AxisBottom
            scale={xScale}
            top={innerHeight}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={{
              fill: 'var(--foreground)',
              fontSize: 11,
              textAnchor: 'middle',
            }}
          />
          <AxisLeft
            scale={yScale}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={{
              fill: 'var(--foreground)',
              fontSize: 11,
              textAnchor: 'end',
              dx: -4,
              dy: 4,
            }}
          />
          <LinePath
            data={data}
            x={d => xScale(xAccessor(d))}
            y={d => yScale(yAccessor(d))}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleTooltip}
            onMouseLeave={hideTooltip}
          />
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
            <strong>X:</strong> {xAccessor(tooltipData)}
          </div>
          <div>
            <strong>Y:</strong> {yAccessor(tooltipData)}
          </div>
        </Tooltip>
      )}
    </div>
  );
};

export default LineChart; 