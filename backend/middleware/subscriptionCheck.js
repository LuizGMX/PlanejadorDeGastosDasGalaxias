import { Payment } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

// Middleware para verificar se o usuário tem uma assinatura ativa
export const checkSubscription = async (req, res, next) => {
  // Se for uma rota pública, permite o acesso
  if (isPublicRoute(req.originalUrl)) {
    console.log('Permitindo acesso a rota pública sem verificação de assinatura');
    return next();
  }

  const t = await sequelize.transaction();
  
  try {
    const user = req.user;
    
    // Se não tiver um usuário no request, deixa passar para o próximo middleware
    // que provavelmente retornará um erro de autenticação
    if (!user) {
      await t.commit();
      console.log('Usuário não autenticado no middleware checkSubscription');
      console.log('URL da requisição:', req.originalUrl);
      return res.status(401).json({ 
        message: 'Usuário não autenticado - checkSubscription do subscriptionCheck.js', 
        subscriptionExpired: true 
      });
    }
    
    
    // Buscar a assinatura do usuário
    const payment = await Payment.findOne({
      where: { 
        user_id: user.id,
        subscription_expiration: {
          [Op.gt]: new Date() // Busca apenas assinaturas não expiradas
        },
        payment_status: 'approved'
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

export default checkSubscription; 