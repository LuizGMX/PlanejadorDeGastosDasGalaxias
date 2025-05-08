import rateLimit from 'express-rate-limit';

/**
 * Middleware de rate limiting que é desativado automaticamente em ambiente de desenvolvimento
 * @param {Object} options - Opções adicionais para o rate limiter
 * @returns {Function} Middleware de rate limiting configurado
 */
export const configureRateLimit = (options = {}) => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Se estiver em ambiente de desenvolvimento e não for explicitamente forçado
  if (isDev && !options.forceInDev) {
    console.log('🔓 Rate limiting desativado em ambiente de desenvolvimento');
    
    // Retorna um middleware que apenas passa para o próximo
    return (req, res, next) => next();
  }
  
  // Configuração padrão para produção
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 2000, // Aumentado: limite de 2000 requisições por IP (ao invés de 1000)
    standardHeaders: true, // Retorna os headers padrão de rate limit
    legacyHeaders: false, // Desabilita os headers antigos
    message: 'Muitas requisições, por favor tente novamente mais tarde.',
    skip: (req) => {
      // Ignorar requisições de verificação de saúde (healthcheck)
      if (req.path.includes('/health')) {
        return true;
      }
      
      // Continue com o rate limiting normal para outras rotas
      return false;
    }
  };
  
  // Combina as opções padrão com as opções personalizadas
  const limiterOptions = {
    ...defaultOptions,
    ...options,
  };
  
  console.log('🔒 Rate limiting ativado com configuração:', limiterOptions);
  
  // Retorna o middleware configurado
  return rateLimit(limiterOptions);
};

/**
 * Configuração de rate limiting para autenticação
 */
export const authLimiter = configureRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Aumentado: limite de 30 tentativas de autenticação (ao invés de 10)
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
}); 