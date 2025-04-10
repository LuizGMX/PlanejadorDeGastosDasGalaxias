import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
import { cn } from '../../lib/utils';

const Chart = ({
  title,
  subtitle,
  data,
  type = 'bar',
  height = 300,
  className,
  formatValue = (value) => value,
  formatLabel = (label) => label,
  colors = ['var(--primary-color)', 'var(--error-color)', 'var(--success-color)'],
  showLegend = true,
  legendPosition = 'bottom',
  onItemClick,
  loading = false,
}) => {
  const total = data?.reduce((acc, item) => acc + item.value, 0) || 0;

  const renderBar = () => (
    <div className="space-y-2">
      {data?.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <HoverCard key={item.label}>
            <HoverCardTrigger asChild>
              <div 
                className="space-y-1 cursor-pointer" 
                onClick={() => onItemClick?.(item)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span>{formatLabel(item.label)}</span>
                  <span>{formatValue(item.value)}</span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2" 
                  indicatorClassName={cn("transition-all", {
                    "bg-primary": index === 0,
                    "bg-destructive": index === 1,
                    "bg-success": index === 2,
                  })}
                />
              </div>
            </HoverCardTrigger>
            <HoverCardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatValue(item.value)} ({percentage.toFixed(1)}%)
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );

  const renderPie = () => (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {data?.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const startAngle = data
            .slice(0, index)
            .reduce((acc, curr) => acc + (curr.value / total) * 360, 0);
          const endAngle = startAngle + (item.value / total) * 360;

          const startRad = (startAngle - 90) * (Math.PI / 180);
          const endRad = (endAngle - 90) * (Math.PI / 180);

          const x1 = 50 + 40 * Math.cos(startRad);
          const y1 = 50 + 40 * Math.sin(startRad);
          const x2 = 50 + 40 * Math.cos(endRad);
          const y2 = 50 + 40 * Math.sin(endRad);

          const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

          return (
            <HoverCard key={item.label}>
              <HoverCardTrigger asChild>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={colors[index % colors.length]}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => onItemClick?.(item)}
                />
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{formatLabel(item.label)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatValue(item.value)} ({percentage.toFixed(1)}%)
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </svg>
    </div>
  );

  const renderLegend = () => (
    <div className={cn("flex gap-4 flex-wrap", {
      "mt-4": legendPosition === "bottom",
      "mb-4": legendPosition === "top",
    })}>
      {data?.map((item, index) => (
        <Badge
          key={item.label}
          variant="outline"
          className="cursor-pointer"
          style={{ borderColor: colors[index % colors.length] }}
          onClick={() => onItemClick?.(item)}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{formatLabel(item.label)}</span>
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
              {type === "bar" ? renderBar() : renderPie()}
            </ScrollArea>
            {showLegend && legendPosition === "bottom" && renderLegend()}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { Chart }; 