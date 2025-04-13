import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  console.log('Iniciando autenticação para:', req.originalUrl);
  console.log('Método:', req.method);
  
  try {
    const authHeader = req.headers.authorization;
    console.log('Header de autorização:', authHeader ? 'Presente' : 'Ausente');
    
    if (!authHeader) {
      console.log('Token não fornecido para rota:', req.originalUrl);
      return res.status(401).json({ 
        message: 'Token não fornecido',
        path: req.originalUrl, 
        details: 'Autenticação necessária para acessar este recurso'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído, verificando...');
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodificado para usuário ID:', decoded.userId);
      
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
        ]
      });
  
      console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
  
      if (!user) {
        console.log('Usuário não encontrado no banco de dados para ID:', decoded.userId);
        return res.status(401).json({ 
          message: 'Usuário não encontrado',
          details: 'O token fornecido corresponde a um usuário que não existe mais'
        });
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
      
      console.log('Autenticação concluída com sucesso para usuário:', user.name);
      next();
    } catch (jwtError) {
      console.error('Erro na verificação do JWT:', {
        error: jwtError.message,
        name: jwtError.name,
        stack: jwtError.stack
      });
  
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Token inválido',
          details: 'O token de autenticação fornecido não é válido ou está malformado'
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expirado',
          details: 'O token de autenticação expirou. Faça login novamente para obter um novo token'
        });
      }
      
      throw jwtError;
    }
  } catch (error) {
    console.error('Erro não tratado na autenticação:', error);
    
    res.status(500).json({ 
      message: 'Erro ao autenticar usuário',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno no servidor'
    });
  }
}; 