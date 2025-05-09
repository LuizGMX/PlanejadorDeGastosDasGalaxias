import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import sequelize from '../config/db.js';

export const authenticate = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    // Se for uma rota pública, permite o acesso
    if (isPublicRoute(req.originalUrl)) {
      console.log('Permitindo acesso a rota pública sem autenticação');
      await t.commit();
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      await t.rollback();
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      await t.rollback();
      return res.status(401).json({ message: 'Token mal formatado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, { transaction: t });
      
      if (!user) {
        await t.rollback();
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      req.user = user;
      await t.commit();
      next();
    } catch (jwtError) {
      await t.rollback();
      console.error('Erro na verificação do JWT:', jwtError);
      return res.status(401).json({ message: 'Token inválido' });
    }
  } catch (error) {
    await t.rollback();
    console.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
};

// Função auxiliar para verificar se a rota é pública
function isPublicRoute(url) {
  const publicRoutes = [
    '/banks',
    '/auth/verify-code',
    '/auth/send-code',
    '/auth/check-email'
  ];
  
  // Verifica se a URL contém /banks e não contém /favorites ou /users
  if (url.includes('/banks') && !url.includes('/banks/favorites') && !url.includes('/banks/users')) {
    return true;
  }
  
  return publicRoutes.some(route => url.endsWith(route));
} 