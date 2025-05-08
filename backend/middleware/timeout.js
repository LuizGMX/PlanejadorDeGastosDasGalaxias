/**
 * Middleware para controlar o timeout das requisições
 * Adiciona um tempo máximo para as respostas serem enviadas
 */

export const timeoutMiddleware = (timeoutMs = 120000) => {
  return (req, res, next) => {
    // Lista de rotas que devem ser ignoradas pelo timeout
    const priorityRoutes = [
      '/health',
      '/auth/check-email',
      '/auth/verify-code',
      '/auth/login',
      '/auth/register',
      '/auth/send-code',
      '/auth/me'
    ];
    
    // Verificar se alguma das rotas prioritárias está incluída no caminho
    if (priorityRoutes.some(route => req.path.includes(route))) {
      return next();
    }
    
    // Monitorar tempo de resposta antes mesmo do timeout
    const startTime = Date.now();
    
    // Definir um limite de monitoramento para alertas (antes do timeout completo)
    const responseMonitorId = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`⚠️ ALERTA: Requisição ${req.method} ${req.originalUrl} está demorando mais de ${timeoutMs/2}ms para responder`);
      }
    }, timeoutMs / 2);
    
    // Criar um timeout para a requisição
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const elapsedTime = Date.now() - startTime;
        console.error(`🚨 TIMEOUT: Requisição para ${req.method} ${req.originalUrl} atingiu o timeout de ${timeoutMs}ms (tempo decorrido: ${elapsedTime}ms)`);
        
        // Registrar informações adicionais para debug
        const requestInfo = {
          method: req.method,
          url: req.originalUrl,
          path: req.path,
          headers: req.headers,
          params: req.params,
          query: req.query,
          body: req.method !== 'GET' ? req.body : 'N/A',
          ip: req.ip,
          timeout: timeoutMs,
          elapsedTime: elapsedTime
        };
        
        console.error('Detalhes da requisição com timeout:', JSON.stringify(requestInfo, null, 2));
        
        try {
          return res.status(504).json({
            error: 'Timeout na solicitação',
            message: 'O servidor demorou muito para responder. Por favor, tente novamente.',
            requestedUrl: req.originalUrl,
            requestedMethod: req.method
          });
        } catch (e) {
          console.error('Erro ao enviar resposta de timeout:', e);
          // Tentar enviar uma resposta mais simples
          res.status(504).end();
        }
      }
    }, timeoutMs);
    
    // Monitorar o tempo de resposta para todas as requisições
    res.on('finish', () => {
      const elapsedTime = Date.now() - startTime;
      
      // Limpar os timeouts
      clearTimeout(timeoutId);
      clearTimeout(responseMonitorId);
      
      // Registrar tempos de resposta lentos
      if (elapsedTime > 5000) { // Alertar para respostas acima de 5 segundos
        console.warn(`⏱️ Resposta lenta: ${req.method} ${req.originalUrl} - ${elapsedTime}ms`);
      }
    });
    
    // Se ocorrer um erro na requisição, também limpe o timeout
    res.on('error', (error) => {
      console.error(`❌ Erro na requisição ${req.method} ${req.originalUrl}:`, error);
      clearTimeout(timeoutId);
      clearTimeout(responseMonitorId);
    });
    
    // Continuar para o próximo middleware
    next();
  };
};

// Timeouts diferentes por tipo de rota
export const configureTimeouts = () => {
  return (req, res, next) => {
    // Lista de rotas que devem ser ignoradas pelo timeout
    const priorityRoutes = [
      '/health',
      '/auth/check-email',
      '/auth/verify-code',
      '/auth/login',
      '/auth/register',
      '/auth/send-code',
      '/auth/me'
    ];
    
    // Verificar se alguma das rotas prioritárias está incluída no caminho
    if (priorityRoutes.some(route => req.path.includes(route))) {
      return next();
    }
    
    let timeoutValue = 60000; // Reduzido para 60 segundos como padrão
    
    // Rotas específicas que podem levar mais tempo
    if (req.path.includes('/dashboard') || 
        req.path.includes('/expenses') || 
        req.path.includes('/incomes')) {
      timeoutValue = 120000; // Reduzido para 2 minutos para operações mais pesadas
    }
    
    // Rotas relacionadas à autenticação
    if (req.path.includes('/auth/') || 
        req.method === 'OPTIONS') {
      timeoutValue = 30000; // 30 segundos para operações de autenticação
    }
    
    // Aplicar o middleware com o timeout configurado
    return timeoutMiddleware(timeoutValue)(req, res, next);
  };
}; 