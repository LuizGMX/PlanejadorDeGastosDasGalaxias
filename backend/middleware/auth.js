import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: [
        'id', 
        'name', 
        'email', 
        'created_at', 
        'updated_at', 
        'financial_goal_name', 
        'financial_goal_amount', 
        'financial_goal_date',
        'phone_number',
        'telegram_verified'
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    // Garante que todos os atributos necessários estão presentes
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
      financial_goal_name: user.financial_goal_name,
      financial_goal_amount: user.financial_goal_amount,
      financial_goal_date: user.financial_goal_date,
      phone_number: user.phone_number,
      telegram_verified: user.telegram_verified
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