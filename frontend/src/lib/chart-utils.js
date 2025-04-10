export const calculatePath = (data, xAccessor, yAccessor, width, height) => {
  if (!data.length) return '';

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (yAccessor(d) / Math.max(...data.map(yAccessor))) * height;
    return `${x},${y}`;
  });

  return `M${points.join('L')}`;
};

export const calculateTicks = (data, accessor, count = 5) => {
  const values = data.map(accessor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min) / (count - 1);
  
  return Array.from({ length: count }, (_, i) => min + step * i);
};

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(date));
}; 