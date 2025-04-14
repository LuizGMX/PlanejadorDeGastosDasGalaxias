/**
 * Formata um valor numérico como moeda brasileira (R$)
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado como moeda brasileira
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  // Converte para número se for string
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Verifica se é um número válido
  if (isNaN(numericValue)) return 'R$ 0,00';
  
  // Formata o valor como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
};

/**
 * Formata uma data para o formato brasileiro (dd/mm/aaaa)
 * @param {string|Date} dateString - Data a ser formatada
 * @returns {string} - Data formatada no padrão brasileiro
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Garante que a data seja tratada como local, não UTC
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return '';
    
    // Formata a data para o padrão brasileiro
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
};

/**
 * Formata uma data com fuso horário para o formato brasileiro (dd/mm/aaaa)
 * @param {string|Date} dateString - Data a ser formatada
 * @returns {string} - Data formatada no padrão brasileiro
 */
export const formatDateStringWithTimezone = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Cria um objeto Date a partir da string
    const date = new Date(dateString);
    
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return '';
    
    // Formata a data para o padrão brasileiro
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Erro ao formatar data com fuso horário:', error);
    return '';
  }
}; 