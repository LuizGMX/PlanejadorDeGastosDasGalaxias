import React from 'react';
import { cn } from '../../lib/utils';

const Legend = ({
  payload,
  formatter,
  iconType = 'circle',
  iconSize = 8,
  className,
  ...props
}) => {
  if (!payload || !payload.length) {
    return null;
  }

  return (
    <div className={cn('legend-container', className)} {...props}>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="legend-item">
          {iconType === 'circle' && (
            <div
              className="legend-icon-circle"
              style={{
                backgroundColor: entry.color,
                width: iconSize,
                height: iconSize,
              }}
            />
          )}
          {iconType === 'line' && (
            <div
              className="legend-icon-line"
              style={{
                backgroundColor: entry.color,
                width: iconSize * 2,
                height: 2,
              }}
            />
          )}
          <span className="legend-text">
            {formatter ? formatter(entry.value, entry.name, entry, index) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Legend; 