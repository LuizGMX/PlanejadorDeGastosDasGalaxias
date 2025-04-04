/**
 * Calcula todas as ocorrências de uma recorrência dentro de um período
 * @param {Object} rule - A regra de recorrência
 * @param {Date} startDate - Data inicial do período
 * @param {Date} endDate - Data final do período
 * @param {Array} exceptions - Lista de exceções
 * @returns {Array} Lista de ocorrências
 */
export function calculateOccurrences(rule, startDate, endDate, exceptions = []) {
  try {
    console.log(`Calculando ocorrências para regra ID: ${rule.id}, tipo: ${rule.type}, descrição: "${rule.description}"`);
    
    if (!rule) {
      console.error('Erro: Regra de recorrência não fornecida');
      return [];
    }
    
    if (!startDate || !endDate) {
      console.error('Erro: Datas de início ou fim não fornecidas', { startDate, endDate });
      return [];
    }
    
    const occurrences = [];
    const ruleStart = new Date(rule.start_date);
    const ruleEnd = rule.end_date ? new Date(rule.end_date) : null;
    
    console.log(`Regra começa em: ${ruleStart.toISOString()}, termina em: ${ruleEnd ? ruleEnd.toISOString() : 'sem data fim'}`);
    console.log(`Período solicitado: ${startDate.toISOString()} até ${endDate.toISOString()}`);
    
    // Converte as datas para o início do dia para comparação
    const periodStart = new Date(startDate);
    periodStart.setHours(0, 0, 0, 0);
    
    const periodEnd = new Date(endDate);
    periodEnd.setHours(23, 59, 59, 999);
    
    // Se a data final da regra é anterior ao período ou a data inicial é posterior, retorna vazio
    if ((ruleEnd && ruleEnd < periodStart) || ruleStart > periodEnd) {
      console.log('Regra fora do período solicitado, retornando array vazio');
      return [];
    }

    // Verifica dados da categoria e banco
    console.log(`Categoria da regra: ID=${rule.category_id}, Nome=${rule.Category?.category_name || 'N/A'}`);
    console.log(`Banco da regra: ID=${rule.bank_id}, Nome=${rule.bank?.name || 'N/A'}`);
    
    if (!rule.Category) {
      console.warn(`Aviso: Categoria não encontrada para a regra ${rule.id}`);
    }
    
    if (!rule.bank) {
      console.warn(`Aviso: Banco não encontrado para a regra ${rule.id}`);
    }

    // Cria um Map das exceções por data para fácil acesso
    console.log(`Processando ${exceptions.length} exceções...`);
    const exceptionMap = new Map();
    
    exceptions.forEach(ex => {
      if (!ex.exception_date) {
        console.warn(`Aviso: Exceção sem data encontrada: ${JSON.stringify(ex)}`);
        return;
      }
      const dateKey = ex.exception_date.toISOString().split('T')[0];
      exceptionMap.set(dateKey, ex);
    });

    // Função para adicionar meses a uma data
    const addMonths = (date, months) => {
      try {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + months);
        return newDate;
      } catch (error) {
        console.error(`Erro ao adicionar ${months} meses à data ${date}:`, error);
        return new Date(date); // Retorna a data original em caso de erro
      }
    };

    // Função para adicionar anos a uma data
    const addYears = (date, years) => {
      try {
        const newDate = new Date(date);
        newDate.setFullYear(newDate.getFullYear() + years);
        return newDate;
      } catch (error) {
        console.error(`Erro ao adicionar ${years} anos à data ${date}:`, error);
        return new Date(date); // Retorna a data original em caso de erro
      }
    };

    // Calcula as ocorrências baseado no tipo de frequência
    let currentDate = new Date(ruleStart);
    let iterationCount = 0;
    const MAX_ITERATIONS = 1000; // Medida de segurança para evitar loops infinitos
    
    while (currentDate <= periodEnd && (!ruleEnd || currentDate <= ruleEnd)) {
      iterationCount++;
      
      if (iterationCount > MAX_ITERATIONS) {
        console.error(`Loop de ocorrências excedeu ${MAX_ITERATIONS} iterações. Possível loop infinito para regra ID: ${rule.id}`);
        break;
      }
      
      // Se a data está dentro do período solicitado
      if (currentDate >= periodStart) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const exception = exceptionMap.get(dateKey);

        if (exception) {
          // Processa a exceção
          console.log(`Encontrada exceção para ${dateKey}, tipo: ${exception.exception_type}`);
          
          switch (exception.exception_type) {
            case 'SKIP':
              // Não adiciona a ocorrência
              console.log(`Ocorrência pulada para ${dateKey}`);
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
              console.log(`Ocorrência modificada para ${dateKey}`);
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
              console.log(`Ocorrência adicional para ${dateKey}`);
              break;
            default:
              console.warn(`Tipo de exceção desconhecido: ${exception.exception_type}`);
              // Trata como ocorrência normal em caso de tipo desconhecido
              occurrences.push({
                date: new Date(currentDate),
                amount: rule.amount,
                description: rule.description,
                isException: false,
                rule: rule
              });
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
      try {
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
          default:
            console.error(`Frequência desconhecida: ${rule.frequency}`);
            // Move um dia para evitar loop infinito
            currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (error) {
        console.error(`Erro ao avançar data para frequência ${rule.frequency}:`, error);
        // Move um dia para evitar loop infinito
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    console.log(`Total de ${occurrences.length} ocorrências calculadas para regra ID: ${rule.id}`);
    return occurrences;
  } catch (error) {
    console.error('Erro ao calcular ocorrências:', error);
    console.error('Regra:', rule);
    console.error('Stack trace:', error.stack);
    return []; // Retorna array vazio em caso de erro
  }
} 