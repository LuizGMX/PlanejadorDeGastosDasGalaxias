import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { getCache, setCache } from '../config/cache.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tenta buscar usuário do cache
    const cacheKey = `user:${decoded.userId}`;
    let user = await getCache(cacheKey);
    
    if (!user) {
      user = await User.findByPk(decoded.userId);
      if (user) {
        await setCache(cacheKey, user);
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    console.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
}; 