import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';

const { User } = models;

export const authenticate = async (req, res, next) => {
  try {
    // Se for uma rota pública, permite o acesso
    if (isPublicRoute(req.originalUrl)) {
      console.log('Permitindo acesso a rota pública:', req.originalUrl);
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('Token não fornecido para rota:', req.originalUrl);
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Token mal formatado para rota:', req.originalUrl);
      return res.status(401).json({ message: 'Token mal formatado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        console.log('Usuário não encontrado para token:', decoded.userId);
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      console.error('Erro na verificação do JWT:', jwtError.message);
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

// Função auxiliar para verificar se a rota é pública
function isPublicRoute(url) {
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/verify-code',
    '/auth/send-code',
    '/auth/check-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/health',
    '/banks'
  ];
  
  // Remove o prefixo da API se existir
  const cleanUrl = url.replace(/^\/api/, '');
  
  // Verifica se a URL contém /banks e não contém /favorites ou /users
  if (cleanUrl.includes('/banks') && !cleanUrl.includes('/banks/favorites') && !cleanUrl.includes('/banks/users')) {
    return true;
  }
  
  return publicRoutes.some(route => cleanUrl.endsWith(route));
} 