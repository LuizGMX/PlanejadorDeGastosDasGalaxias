import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

const ResponsiveContainer = ({
  width = '100%',
  height = '100%',
  className,
  children,
  ...props
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: containerWidth,
          height: containerHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full',
        className
      )}
      style={{
        width: width === '100%' ? '100%' : `${width}px`,
        height: height === '100%' ? '100%' : `${height}px`
      }}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            width: dimensions.width,
            height: dimensions.height
          });
        }
        return child;
      })}
    </div>
  );
};

export default ResponsiveContainer; 