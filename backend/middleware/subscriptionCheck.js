import { Payment } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

// Middleware para verificar se o usuário tem uma assinatura ativa
export const checkSubscription = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const user = req.user;
    
    // Se não tiver um usuário no request, deixa passar para o próximo middleware
    // que provavelmente retornará um erro de autenticação
    if (!user) {
      await t.commit();
      return next();
    }
    
    // Buscar a assinatura do usuário
    const payment = await Payment.findOne({
      where: { 
        user_id: user.id,
        subscription_expiration: {
          [Op.gt]: new Date() // Busca apenas assinaturas não expiradas
        }
      },
      order: [['subscription_expiration', 'DESC']], // Busca a assinatura mais recente
      transaction: t
    });
    
    // Se não existe uma assinatura válida
    if (!payment) {
      await t.commit();
      return res.status(403).json({ 
        message: 'Sua assinatura expirou ou não existe', 
        subscriptionExpired: true 
      });
    }
    
    // Usuário tem acesso
    await t.commit();
    next();
  } catch (error) {
    await t.rollback();
    console.error('Erro ao verificar assinatura:', error);
    res.status(500).json({ message: 'Erro ao verificar assinatura' });
  }
};

export default checkSubscription; 