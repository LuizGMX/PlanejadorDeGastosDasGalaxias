import React from 'react';
import { cn } from '../../lib/utils';

const PieChart = ({
  data = [],
  width = '100%',
  height = 300,
  margin = { top: 10, right: 10, left: 10, bottom: 10 },
  innerRadius = 0,
  outerRadius = 80,
  paddingAngle = 0,
  className,
  ...props
}) => {
  // Garantir que width e height são números para os cálculos SVG
  const numericWidth = typeof width === 'number' ? width : 300;
  const numericHeight = typeof height === 'number' ? height : 300;
  const centerX = numericWidth / 2;
  const centerY = numericHeight / 2;

  // Validar e preparar os dados
  if (!data || !Array.isArray(data)) {
    return (
      <div 
        className={cn('relative w-full overflow-hidden flex items-center justify-center', className)}
        style={{ height }}
        {...props}
      >
        <div className="text-center text-gray-400">
          Sem dados para exibir
        </div>
      </div>
    );
  }

  // Filtrar dados inválidos (sem valor ou com valor NaN)
  const validData = data.filter(item => 
    item && 
    typeof item.value !== 'undefined' && 
    !isNaN(item.value) && 
    item.value > 0
  );

  if (validData.length === 0) {
    return (
      <div 
        className={cn('relative w-full overflow-hidden flex items-center justify-center', className)}
        style={{ height }}
        {...props}
      >
        <div className="text-center text-gray-400">
          Sem dados válidos para exibir
        </div>
      </div>
    );
  }

  // Calcular total e ângulos
  const total = validData.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;

  return (
    <div 
      className={cn(
        'relative w-full overflow-hidden',
        className
      )}
      style={{ height }}
      {...props}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${numericWidth} ${numericHeight}`}
        className="overflow-visible"
      >
        <g transform={`translate(${centerX},${centerY})`}>
          {validData.map((item, index) => {
            // Calcular o ângulo proporcional ao valor
            const angle = (item.value / total) * 360;
            
            // Calcular pontos para o arco SVG
            const x1 = Math.cos((startAngle * Math.PI) / 180) * outerRadius;
            const y1 = Math.sin((startAngle * Math.PI) / 180) * outerRadius;
            const x2 = Math.cos(((startAngle + angle) * Math.PI) / 180) * outerRadius;
            const y2 = Math.sin(((startAngle + angle) * Math.PI) / 180) * outerRadius;
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            const path = [
              `M ${x1} ${y1}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L 0 0`,
              'Z'
            ].join(' ');

            // Atualizar o ângulo inicial para o próximo segmento
            startAngle += angle;

            return (
              <path
                key={index}
                d={path}
                fill={item.color || `hsl(${(index * 360) / validData.length}, 70%, 50%)`}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
          {innerRadius > 0 && (
            <circle
              cx="0"
              cy="0"
              r={innerRadius}
              fill="white"
              className="shadow-sm"
            />
          )}
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {total}
          </div>
          <div className="text-sm text-gray-500">
            Total
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieChart; 