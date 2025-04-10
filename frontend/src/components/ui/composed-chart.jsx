import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { cn } from '../../lib/utils';

const ComposedChart = ({
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
  series = [{ key: 'value', type: 'line' }],
  yAxisWidth = 60,
  xAxisHeight = 40,
}) => {
  const allValues = data?.flatMap(item => series.map(s => item[s.key])) || [];
  const minValue = Math.min(0, ...allValues);
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

  const renderSeries = (seriesConfig, index) => {
    if (!data?.length) return null;

    const { key, type } = seriesConfig;

    if (type === 'line') {
      const points = data.map((item, i) => `${getX(i)},${getY(item[key])}`).join(' ');
      
      return (
        <g key={key}>
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
                  cy={getY(item[key])}
                  r="4"
                  fill={colors[index % colors.length]}
                  className="cursor-pointer transition-all hover:r-6"
                  onClick={() => onItemClick?.({ ...item, series: key })}
                />
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                  <p className="text-sm text-muted-foreground">
                    {key}: {formatValue(item[key])}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </g>
      );
    }

    if (type === 'area') {
      const areaPoints = [
        `${getX(0)},${getY(yMin)}`,
        ...data.map((item, i) => `${getX(i)},${getY(item[key])}`),
        `${getX(data.length - 1)},${getY(yMin)}`
      ].join(' ');

      const linePoints = data.map((item, i) => `${getX(i)},${getY(item[key])}`).join(' ');

      return (
        <g key={key}>
          <defs>
            <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[index % colors.length]} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors[index % colors.length]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={areaPoints}
            fill={`url(#gradient-${key})`}
            className="transition-all duration-300"
          />
          <polyline
            points={linePoints}
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
                  cy={getY(item[key])}
                  r="4"
                  fill={colors[index % colors.length]}
                  className="cursor-pointer transition-all hover:r-6"
                  onClick={() => onItemClick?.({ ...item, series: key })}
                />
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                  <p className="text-sm text-muted-foreground">
                    {key}: {formatValue(item[key])}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </g>
      );
    }

    if (type === 'bar') {
      const barWidth = `calc((100% - ${yAxisWidth}px) / ${data.length} * 0.8)`;
      
      return (
        <g key={key}>
          {data.map((item, i) => {
            const barHeight = getY(yMin) - getY(item[key]);
            return (
              <HoverCard key={i}>
                <HoverCardTrigger asChild>
                  <rect
                    x={`calc(${getX(i)} - ${barWidth} / 2)`}
                    y={getY(item[key])}
                    width={barWidth}
                    height={barHeight}
                    fill={colors[index % colors.length]}
                    className="cursor-pointer transition-all hover:opacity-80"
                    onClick={() => onItemClick?.({ ...item, series: key })}
                  />
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                    <p className="text-sm text-muted-foreground">
                      {key}: {formatValue(item[key])}
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </g>
      );
    }

    return null;
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
      {series.map((s, index) => (
        <Badge
          key={s.key}
          variant="outline"
          className="cursor-pointer"
          style={{ borderColor: colors[index % colors.length] }}
          onClick={() => onItemClick?.({ series: s.key })}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{s.key}</span>
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
                {series.map((s, index) => renderSeries(s, index))}
              </svg>
            </ScrollArea>
            {showLegend && legendPosition === "bottom" && renderLegend()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { ComposedChart }; 