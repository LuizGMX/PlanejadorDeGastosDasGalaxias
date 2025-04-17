/**
 * Funções utilitárias para lidar com recorrências de receitas e despesas
 */

/**
 * Calcula as ocorrências para um item recorrente (receita ou despesa)
 * @param {Object} recurrentItem - O item recorrente (despesa ou receita)
 * @param {Date} startDate - Data de início do período de filtro
 * @param {Date} endDate - Data de fim do período de filtro
 * @param {String} dateField - Nome do campo de data (expense_date ou date)
 * @returns {Array} - Array de ocorrências no período
 */
export const calculateRecurringOccurrences = (recurrentItem, startDate, endDate, dateField = 'date') => {
  const occurrences = [];
  const recurrenceType = recurrentItem.recurrence_type;
  const itemStartDate = new Date(recurrentItem.start_date || recurrentItem[dateField]);
  const itemEndDate = recurrentItem.end_date ? new Date(recurrentItem.end_date) : new Date('2099-12-31');
  
  // Normaliza as datas para meia-noite para evitar problemas de comparação
  const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
  const normalizedItemStartDate = new Date(itemStartDate.getFullYear(), itemStartDate.getMonth(), itemStartDate.getDate());
  const normalizedItemEndDate = new Date(itemEndDate.getFullYear(), itemEndDate.getMonth(), itemEndDate.getDate(), 23, 59, 59);
  
  // Se a data de início da recorrência é posterior ao período ou a data de fim é anterior, retorna vazio
  if (normalizedItemStartDate > normalizedEndDate || normalizedItemEndDate < normalizedStartDate) {
    return [];
  }

  // Começamos a partir da data original do item recorrente
  let currentDate = new Date(normalizedItemStartDate);
  
  // Avançamos até encontrar a primeira data no ou após o período de início
  while (currentDate < normalizedStartDate) {
    currentDate = getNextRecurringDate(currentDate, recurrenceType);
  }
  
  // Mapeia exceções para verificar datas a serem puladas
  const exceptionDates = new Set((recurrentItem.exceptions || []).map(ex => 
    new Date(ex.exception_date).toISOString().split('T')[0]
  ));

  while (currentDate <= normalizedEndDate && currentDate <= normalizedItemEndDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Verifica se esta data não é uma exceção
    if (!exceptionDates.has(dateKey)) {
      // Preservamos a hora da despesa original
      const originalTime = new Date(recurrentItem[dateField]);
      const occurrenceDate = new Date(
        currentDate.getFullYear(), 
        currentDate.getMonth(), 
        currentDate.getDate(),
        originalTime.getHours(),
        originalTime.getMinutes(),
        originalTime.getSeconds()
      );
      
      occurrences.push({
        ...recurrentItem.toJSON ? recurrentItem.toJSON() : recurrentItem,
        id: `rec_${recurrentItem.id}_${currentDate.getTime()}`,
        [dateField]: occurrenceDate,
        isRecurringOccurrence: true,
        originalRecurrenceId: recurrentItem.id,
        originalDescription: recurrentItem.description, // Preserva a descrição original
        originalAmount: recurrentItem.amount, // Preserva o valor original
      });
    }

    // Avança para a próxima data baseada no tipo de recorrência
    currentDate = getNextRecurringDate(currentDate, recurrenceType);
  }

  return occurrences;
};

/**
 * Calcula a próxima data em uma sequência recorrente
 * @param {Date} date - Data atual
 * @param {String} recurrenceType - Tipo de recorrência (daily, weekly, monthly, etc)
 * @returns {Date} - Próxima data na sequência
 */
export const getNextRecurringDate = (date, recurrenceType) => {
  const next = new Date(date);
  
  switch (recurrenceType) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1); // Por padrão assume mensal
  }
  
  return next;
};

export default {
  calculateRecurringOccurrences,
  getNextRecurringDate
}; 