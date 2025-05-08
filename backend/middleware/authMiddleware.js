import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await models.User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const verifyOwnership = (model) => async (req, res, next) => {
  try {
    const record = await model.findByPk(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }

    const decryptedUserId = record.user_id;
    
    if (decryptedUserId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    req.record = record;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao verificar propriedade' });
  }
}; 