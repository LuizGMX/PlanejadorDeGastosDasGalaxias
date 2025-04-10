"use client"

import React from 'react';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { GridRows, GridColumns } from '@visx/grid';
import { useTooltip, Tooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { cn } from '../../../lib/utils';
import { Card } from "../card";

const BarChart = ({
  data = [],
  width = 600,
  height = 400,
  margin = { top: 20, right: 20, bottom: 50, left: 50 },
  xAccessor = d => d.x,
  yAccessor = d => d.y,
  fill = "var(--primary)",
  className,
  title,
  subtitle,
  showTooltip = true,
  showGrid = true,
  showLegend = true,
  colors = ['#2196F3'],
  isMobile = false,
  onBarClick,
  ...props
}) => {
  const { showTooltip: visxShowTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop } = useTooltip();

  // Garantir que width e height são números
  const numericWidth = typeof width === 'number' ? width : parseInt(width) || 600;
  const numericHeight = typeof height === 'number' ? height : parseInt(height) || 400;
  
  // Dimensions
  const innerWidth = numericWidth - margin.left - margin.right;
  const innerHeight = numericHeight - margin.top - margin.bottom;

  // Usar dados originais ou um array vazio como fallback
  const dataArray = Array.isArray(data) ? data : [];
  
  // Se não houver dados, renderizar mensagem vazia
  if (dataArray.length === 0) {
    return (
      <Card className={cn('relative flex items-center justify-center', className)} {...props}>
        <div className="text-center text-gray-400 p-4">
          Sem dados para exibir
        </div>
      </Card>
    );
  }

  // Escalas
  try {
    const xScale = scaleBand()
      .range([0, innerWidth])
      .domain(dataArray.map(xAccessor))
      .padding(0.2);

    const yValues = dataArray.map(yAccessor).filter(v => !isNaN(v));
    const maxY = yValues.length > 0 ? Math.max(...yValues) : 0;

    const yScale = scaleLinear()
      .range([innerHeight, 0])
      .domain([0, maxY])
      .nice();

    // Tooltip handler
    const handleTooltip = (event, bar) => {
      const { x, y } = localPoint(event) || { x: 0, y: 0 };
      visxShowTooltip({
        tooltipData: bar,
        tooltipLeft: x,
        tooltipTop: y,
      });
    };

    return (
      <Card className={cn('relative', className)} {...props}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <div className="relative">
          <svg width={numericWidth} height={numericHeight} viewBox={`0 0 ${numericWidth} ${numericHeight}`}>
            <Group left={margin.left} top={margin.top}>
              {showGrid && (
                <>
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
                </>
              )}
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
              {dataArray.map((d, i) => {
                const yValue = yAccessor(d);
                // Pular valores NaN ou indefinidos
                if (isNaN(yValue) || yValue === undefined) return null;
                
                const barHeight = innerHeight - yScale(yValue);
                const barX = xScale(xAccessor(d));
                const barY = innerHeight - barHeight;

                return (
                  <Bar
                    key={`bar-${i}`}
                    x={barX}
                    y={barY}
                    width={xScale.bandwidth()}
                    height={barHeight}
                    fill={fill}
                    onMouseMove={(e) => handleTooltip(e, d)}
                    onMouseLeave={hideTooltip}
                    onClick={() => onBarClick && onBarClick(d, i)}
                  />
                );
              })}
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
                <strong>Label:</strong> {xAccessor(tooltipData)}
              </div>
              <div>
                <strong>Valor:</strong> {yAccessor(tooltipData)}
              </div>
            </Tooltip>
          )}
        </div>
      </Card>
    );
  } catch (error) {
    console.error("Erro ao renderizar BarChart:", error);
    return (
      <Card className={cn('relative flex items-center justify-center', className)} {...props}>
        <div className="text-center text-gray-400 p-4">
          Erro ao renderizar gráfico
        </div>
      </Card>
    );
  }
};

export default BarChart; 