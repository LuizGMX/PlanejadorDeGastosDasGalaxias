import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';
import { Op } from 'sequelize';

const { User } = models;

// Cache de tokens para reduzir consultas ao banco
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 15 * 60 * 1000; // 15 minutos

export const authenticate = async (req, res, next) => {
  try {
    // Se for uma rota pública, permite o acesso imediatamente
    if (isPublicRoute(req.originalUrl)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token mal formatado' });
    }

    try {
      // Verificar se o token está em cache
      const cachedUser = tokenCache.get(token);
      const currentTime = Date.now();
      
      if (cachedUser && cachedUser.expiresAt > currentTime) {
        // Se estiver em cache e válido, use-o
        req.user = cachedUser.user;
        return next();
      }
      
      // Se não estiver em cache ou expirou, verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
      
      // Busca o usuário sem transação para melhor performance
      // Limitando atributos para melhor desempenho
      const user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'name', 'email', 'telegram_verified'],
        raw: true,
        timeout: 5000 // Timeout de 5 segundos para esta consulta
      });
      
      if (!user) {
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      // Armazenar em cache para uso futuro
      const expiresAt = currentTime + TOKEN_CACHE_TTL;
      tokenCache.set(token, { user, expiresAt });
      
      // Limpar cache antigas periodicamente
      if (Math.random() < 0.01) { // 1% de chance de limpar o cache em cada requisição
        cleanExpiredCache();
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      return res.status(401).json({ message: 'Token inválido' });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
};

// Função para limpar tokens expirados do cache
function cleanExpiredCache() {
  const currentTime = Date.now();
  for (const [token, data] of tokenCache.entries()) {
    if (data.expiresAt <= currentTime) {
      tokenCache.delete(token);
    }
  }
}

// Função auxiliar para verificar se a rota é pública
function isPublicRoute(url) {
  // Remove o prefixo da API se existir
  const cleanUrl = url.replace(/^\/api/, '');
  
  // Lista de rotas públicas
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/verify-code',
    '/auth/send-code',
    '/auth/check-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/send-access-code',
    '/health',
    '/banks'
  ];
  
  // Verifica se a URL contém /banks e não contém /favorites ou /users
  if (cleanUrl.includes('/banks') && !cleanUrl.includes('/banks/favorites') && !cleanUrl.includes('/banks/users')) {
    return true;
  }
  
  // Verifica se a URL corresponde a alguma rota pública
  return publicRoutes.some(route => cleanUrl === route || cleanUrl.endsWith(route));
} 