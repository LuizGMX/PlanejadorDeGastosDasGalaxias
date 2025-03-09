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
      user = await User.findByPk(decoded.userId, {
        attributes: ['id', 'name', 'email', 'net_income', 'created_at', 'updated_at']
      });
      if (user) {
        await setCache(cacheKey, user);
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    // Garante que todos os atributos necessários estão presentes
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      net_income: parseFloat(user.net_income || 0),
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    
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