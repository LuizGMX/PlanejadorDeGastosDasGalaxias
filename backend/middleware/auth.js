import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  console.log('Iniciando autenticação...');
  try {
    const authHeader = req.headers.authorization;
    console.log('Header de autorização:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader) {
      console.log('Token não fornecido');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', { userId: decoded.userId });
    
    const user = await User.findByPk(decoded.userId, {
      attributes: [
        'id', 
        'name', 
        'email', 
        'created_at', 
        'updated_at', 
        'financial_goal_name',
        'financial_goal_amount',
        'financial_goal_start_date',
        'financial_goal_end_date',
        'telegram_verified'
      ],
      where: { id: decoded.userId }
    });

    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');

    if (!user) {
      console.log('Usuário não encontrado no banco de dados');
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      telegram_verified: user.telegram_verified,
      financial_goal_name: user.financial_goal_name,
      financial_goal_amount: user.financial_goal_amount,
      financial_goal_start_date: user.financial_goal_start_date,
      financial_goal_end_date: user.financial_goal_end_date
    };
    
    console.log('Autenticação concluída com sucesso');
    next();
  } catch (error) {
    console.error('Erro durante a autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      console.log('Erro de token inválido');
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      console.log('Erro de token expirado');
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    console.error('Erro não tratado na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário: ' + error.message });
  }
}; 