import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';
import { Op } from 'sequelize';

const { User, Payment } = models;

// Cache para tokens já verificados - melhora performance drasticamente
const tokenCache = new Map();
// Cache para registros de usuários - reduz consultas ao banco
const userCache = new Map();
// Cache para pagamentos - reduz consultas ao banco
const paymentCache = new Map();

// Limpa o cache a cada 5 minutos para não consumir memória demais
setInterval(() => {
  tokenCache.clear();
  userCache.clear();
  paymentCache.clear();
  console.log('🧹 Cache de autenticação limpo');
}, 5 * 60 * 1000);

export const authenticate = async (req, res, next) => {
  // Verificar se a rota requer autenticação
  const allowedPaths = [
    `/health`,
    `/auth/check-email`,
    `/auth/verify-code`, 
    `/auth/login`, 
    `/auth/register`, 
    `/auth/send-code`,
    `/auth/send-access-code`,
    `/auth/me`,
    `/auth/verify-payment`
  ];
  
  const isPublicRoute = allowedPaths.some(path => 
    req.path.endsWith(path) || req.path.includes(`${path}/`)
  );
  
  if (isPublicRoute) {
    return next();
  }

  // Registrar métricas para monitorar desempenho
  const startTime = Date.now();
  
  try {
    // Verificar se o token existe
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verifica no cache primeiro (melhora drasticamente o desempenho)
    if (tokenCache.has(token)) {
      req.userId = tokenCache.get(token);
      // Log de performance para tokens em cache
      const endTime = Date.now();
      if (endTime - startTime > 50) { // Alerta se demorar mais de 50ms
        console.log(`⚠️ Autenticação de token em cache demorou ${endTime - startTime}ms`);
      }
      return next();
    }

    // Verificar o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    // Adicionar ao cache
    tokenCache.set(token, decoded.userId);

    // Verificar se o usuário ainda existe
    // Verificar no cache primeiro
    if (userCache.has(decoded.userId)) {
      const cachedUser = userCache.get(decoded.userId);
      if (Date.now() - cachedUser.timestamp < 5 * 60 * 1000) { // Cache válido por 5 minutos
        // Se está no cache e é válido, não precisa consultar o banco
        // Prossegue para verificação de pagamento se necessário
      } else {
        // Cache expirado, remove
        userCache.delete(decoded.userId);
      }
    } else {
      // Se não estiver no cache, busca no banco
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id'],
        raw: true
      });

      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }
      
      // Adiciona ao cache
      userCache.set(decoded.userId, {
        id: user.id,
        timestamp: Date.now()
      });
    }

    // Para rotas que exigem verificação de pagamento
    if (req.path.includes('/dashboard') || req.path.includes('/expenses') || req.path.includes('/incomes')) {
      // Verifica no cache de pagamentos primeiro
      if (paymentCache.has(decoded.userId)) {
        const cachedPayment = paymentCache.get(decoded.userId);
        if (Date.now() - cachedPayment.timestamp < 5 * 60 * 1000) { // Cache válido por 5 minutos
          if (new Date(cachedPayment.expirationDate) > new Date()) {
            // Pagamento válido no cache
            return next();
          } else {
            // Pagamento expirado no cache
            return res.status(402).json({ message: 'Assinatura expirada ou não encontrada' });
          }
        } else {
          // Cache expirado, remove
          paymentCache.delete(decoded.userId);
        }
      }
      
      // Se não estiver no cache, busca no banco
      const payment = await Payment.findOne({
        where: {
          user_id: decoded.userId,
          subscription_expiration: {
            [Op.gt]: new Date()
          }
        },
        order: [['subscription_expiration', 'DESC']],
        raw: true
      });

      if (!payment) {
        return res.status(402).json({ message: 'Assinatura expirada ou não encontrada' });
      }
      
      // Adiciona ao cache
      paymentCache.set(decoded.userId, {
        expirationDate: payment.subscription_expiration,
        timestamp: Date.now()
      });
    }

    // Log de desempenho
    const endTime = Date.now();
    if (endTime - startTime > 200) { // Alerta se demorar mais de 200ms
      console.log(`⚠️ Autenticação completa demorou ${endTime - startTime}ms para usuário ${decoded.userId}`);
    }
    
    return next();
  } catch (error) {
    // Log de desempenho para erros
    const endTime = Date.now();
    console.log(`⚠️ Erro na autenticação - demorou ${endTime - startTime}ms`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Tratar erros específicos do banco de dados
    if (error.name === 'SequelizeConnectionError' || 
        error.name === 'SequelizeConnectionRefusedError' ||
        error.name === 'SequelizeHostNotFoundError' ||
        error.name === 'SequelizeAccessDeniedError') {
      console.error('Erro crítico de conexão com o banco de dados:', error);
      return res.status(503).json({ message: 'Serviço temporariamente indisponível. Tente novamente mais tarde.' });
    }

    console.error('Erro de autenticação:', error);
    return res.status(500).json({ message: 'Erro na autenticação' });
  }
};

// Remover a função não utilizada
// Função auxiliar para verificar se a rota é pública
// function isPublicRoute(url) {
//   // Remove o prefixo da API se existir
//   const cleanUrl = url.replace(/^\/api/, '');
//   
//   // Lista de rotas públicas
//   const publicRoutes = [
//     '/auth/login',
//     '/auth/register',
//     '/auth/verify-code',
//     '/auth/send-code',
//     '/auth/check-email',
//     '/auth/forgot-password',
//     '/auth/reset-password',
//     '/auth/send-access-code',
//     '/health',
//     '/banks'
//   ];
//   
//   // Verifica se a URL contém /banks e não contém /favorites ou /users
//   if (cleanUrl.includes('/banks') && !cleanUrl.includes('/banks/favorites') && !cleanUrl.includes('/banks/users')) {
//     return true;
//   }
//   
//   // Verifica se a URL corresponde a alguma rota pública
//   return publicRoutes.some(route => cleanUrl === route || cleanUrl.endsWith(route));
// } 