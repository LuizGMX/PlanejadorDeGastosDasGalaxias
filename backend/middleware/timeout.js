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
    
    // Criar um timeout para a requisição
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⚠️ Requisição para ${req.method} ${req.originalUrl} atingiu o timeout de ${timeoutMs}ms`);
        
        // Registrar informações adicionais para debug
        const requestInfo = {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          params: req.params,
          query: req.query,
          body: req.method !== 'GET' ? req.body : 'N/A',
          ip: req.ip,
          timeout: timeoutMs
        };
        
        console.error('Detalhes da requisição com timeout:', JSON.stringify(requestInfo, null, 2));
        
        return res.status(503).json({
          error: 'Timeout na solicitação',
          message: 'O servidor demorou muito para responder. Por favor, tente novamente.',
          requestedUrl: req.originalUrl,
          requestedMethod: req.method
        });
      }
    }, timeoutMs);
    
    // Limpar o timeout quando a resposta for enviada
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    // Se ocorrer um erro na requisição, também limpe o timeout
    res.on('error', () => {
      clearTimeout(timeoutId);
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
    
    let timeoutValue = 120000; // 120 segundos como padrão
    
    // Rotas específicas que podem levar mais tempo
    if (req.path.includes('/dashboard') || 
        req.path.includes('/expenses') || 
        req.path.includes('/incomes')) {
      timeoutValue = 180000; // 3 minutos para operações mais pesadas
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