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
    max: 100, // limite de 100 requisições por IP
    standardHeaders: true, // Retorna os headers padrão de rate limit
    legacyHeaders: false, // Desabilita os headers antigos
    message: 'Muitas requisições, por favor tente novamente mais tarde.',
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
  max: 10, // limite ainda mais restrito para tentativas de login
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
}); 