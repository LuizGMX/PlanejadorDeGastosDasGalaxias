import React from 'react';
import { cn } from '../../lib/utils';

const Tooltip = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
  content,
  ...props
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const defaultContent = (
    <div className={cn('tooltip-content', className)} {...props}>
      {labelFormatter ? (
        <div className="tooltip-label">{labelFormatter(label)}</div>
      ) : (
        <div className="tooltip-label">{label}</div>
      )}
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="tooltip-item">
          <div
            className="tooltip-color"
            style={{ backgroundColor: entry.color }}
          />
          <div className="tooltip-name">{entry.name}</div>
          <div className="tooltip-value">
            {formatter
              ? formatter(entry.value, entry.name, entry, index)
              : entry.value}
          </div>
        </div>
      ))}
    </div>
  );

  return content ? content({ active, payload, label }) : defaultContent;
};

export default Tooltip; 