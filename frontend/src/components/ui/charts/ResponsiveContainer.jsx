"use client"

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const ResponsiveContainer = ({
  width,
  height,
  aspect = 2,
  minHeight = 200,
  maxHeight = 400,
  className,
  children,
  ...props
}) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = Math.min(
          Math.max(containerWidth / aspect, minHeight),
          maxHeight
        );
        setDimensions({ width: containerWidth, height: containerHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [aspect, minHeight, maxHeight]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      style={{
        height: dimensions.height || height,
      }}
      {...props}
    >
      {React.cloneElement(children, {
        width: dimensions.width || width,
        height: dimensions.height || height,
      })}
    </div>
  );
};

export default ResponsiveContainer; 