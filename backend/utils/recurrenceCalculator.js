/**
 * Calcula todas as ocorrências de uma recorrência dentro de um período
 * @param {Object} rule - A regra de recorrência
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @param {Array} exceptions - Lista de exceções
 * @returns {Array} Lista de ocorrências
 */
export function calculateOccurrences(rule, startDate, endDate, exceptions = []) {
  const occurrences = [];
  const ruleStart = new Date(rule.start_date);
  const ruleEnd = rule.end_date ? new Date(rule.end_date) : null;
  
  // Converte as datas para o início do dia para comparação
  const periodStart = new Date(startDate.setHours(0, 0, 0, 0));
  const periodEnd = new Date(endDate.setHours(23, 59, 59, 999));
  
  // Se a data final da regra é anterior ao período ou a data inicial é posterior, retorna vazio
  if ((ruleEnd && ruleEnd < periodStart) || ruleStart > periodEnd) {
    return [];
  }

  // Cria um Map das exceções por data para fácil acesso
  const exceptionMap = new Map(
    exceptions.map(ex => [ex.exception_date.toISOString().split('T')[0], ex])
  );

  // Função para adicionar meses a uma data
  const addMonths = (date, months) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  };

  // Função para adicionar anos a uma data
  const addYears = (date, years) => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
  };

  // Calcula as ocorrências baseado no tipo de frequência
  let currentDate = new Date(ruleStart);
  while (currentDate <= periodEnd && (!ruleEnd || currentDate <= ruleEnd)) {
    // Se a data está dentro do período solicitado
    if (currentDate >= periodStart) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const exception = exceptionMap.get(dateKey);

      if (exception) {
        // Processa a exceção
        switch (exception.exception_type) {
          case 'SKIP':
            // Não adiciona a ocorrência
            break;
          case 'MODIFY':
            occurrences.push({
              date: new Date(currentDate),
              amount: exception.modified_amount || rule.amount,
              description: exception.modified_description || rule.description,
              isException: true,
              exceptionReason: exception.reason,
              rule: rule
            });
            break;
          case 'ADD':
            // Adiciona tanto a ocorrência normal quanto a adicional
            occurrences.push({
              date: new Date(currentDate),
              amount: rule.amount,
              description: rule.description,
              isException: false,
              rule: rule
            });
            occurrences.push({
              date: new Date(currentDate),
              amount: exception.modified_amount,
              description: exception.modified_description,
              isException: true,
              exceptionReason: exception.reason,
              rule: rule
            });
            break;
        }
      } else {
        // Adiciona ocorrência normal
        occurrences.push({
          date: new Date(currentDate),
          amount: rule.amount,
          description: rule.description,
          isException: false,
          rule: rule
        });
      }
    }

    // Avança para a próxima data baseado na frequência
    switch (rule.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
    }
  }

  return occurrences;
} 