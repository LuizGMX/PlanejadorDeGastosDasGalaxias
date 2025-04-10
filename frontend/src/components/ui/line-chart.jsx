import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { cn } from '../../lib/utils';

const LineChart = ({
  title,
  subtitle,
  data,
  height = 300,
  className,
  formatValue = (value) => value,
  formatLabel = (label) => label,
  colors = ['var(--primary-color)', 'var(--error-color)', 'var(--success-color)'],
  showLegend = true,
  legendPosition = 'bottom',
  onItemClick,
  loading = false,
  lines = ['value'],
  yAxisWidth = 60,
  xAxisHeight = 40,
}) => {
  const allValues = data?.flatMap(item => lines.map(line => item[line])) || [];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1;

  const yMin = Math.floor(minValue - padding);
  const yMax = Math.ceil(maxValue + padding);

  const getY = (value) => {
    const availableHeight = height - xAxisHeight;
    return availableHeight - ((value - yMin) / (yMax - yMin) * availableHeight);
  };

  const getX = (index) => {
    const availableWidth = `calc(100% - ${yAxisWidth}px)`;
    return `calc(${yAxisWidth}px + (${index} * ${availableWidth} / ${(data?.length || 1) - 1}))`;
  };

  const renderLine = (lineName, index) => {
    if (!data?.length) return null;

    const points = data.map((item, i) => `${getX(i)},${getY(item[lineName])}`).join(' ');
    
    return (
      <g key={lineName}>
        <polyline
          points={points}
          fill="none"
          stroke={colors[index % colors.length]}
          strokeWidth="2"
          className="transition-all duration-300"
        />
        {data.map((item, i) => (
          <HoverCard key={i}>
            <HoverCardTrigger asChild>
              <circle
                cx={getX(i)}
                cy={getY(item[lineName])}
                r="4"
                fill={colors[index % colors.length]}
                className="cursor-pointer transition-all hover:r-6"
                onClick={() => onItemClick?.({ ...item, line: lineName })}
              />
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                <p className="text-sm text-muted-foreground">
                  {lineName}: {formatValue(item[lineName])}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </g>
    );
  };

  const renderYAxis = () => {
    const steps = 5;
    const stepValue = (yMax - yMin) / steps;
    
    return Array.from({ length: steps + 1 }).map((_, i) => {
      const value = yMin + (stepValue * i);
      return (
        <g key={i}>
          <text
            x={yAxisWidth - 8}
            y={getY(value)}
            textAnchor="end"
            alignmentBaseline="middle"
            className="text-xs text-muted-foreground"
          >
            {formatValue(value)}
          </text>
          <line
            x1={yAxisWidth}
            y1={getY(value)}
            x2="100%"
            y2={getY(value)}
            stroke="var(--border-color)"
            strokeDasharray="4,4"
            strokeWidth="1"
          />
        </g>
      );
    });
  };

  const renderXAxis = () => {
    if (!data?.length) return null;

    return data.map((item, i) => (
      <text
        key={i}
        x={getX(i)}
        y={height - 8}
        textAnchor="middle"
        className="text-xs text-muted-foreground"
      >
        {formatLabel(item.label)}
      </text>
    ));
  };

  const renderLegend = () => (
    <div className={cn("flex gap-4 flex-wrap", {
      "mt-4": legendPosition === "bottom",
      "mb-4": legendPosition === "top",
    })}>
      {lines.map((line, index) => (
        <Badge
          key={line}
          variant="outline"
          className="cursor-pointer"
          style={{ borderColor: colors[index % colors.length] }}
          onClick={() => onItemClick?.({ line })}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{line}</span>
          </div>
        </Badge>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {showLegend && legendPosition === "top" && renderLegend()}
            <ScrollArea className="w-full" style={{ height }}>
              <svg width="100%" height={height} className="overflow-visible">
                {renderYAxis()}
                {renderXAxis()}
                {lines.map((line, index) => renderLine(line, index))}
              </svg>
            </ScrollArea>
            {showLegend && legendPosition === "bottom" && renderLegend()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { LineChart }; 