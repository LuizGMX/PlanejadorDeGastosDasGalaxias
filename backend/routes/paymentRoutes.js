import { Router } from 'express';
import dotenv from 'dotenv';
import { User, Payment } from '../models/index.js';
import { authenticate } from './auth.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

dotenv.config();
const router = Router();

// Verificação de acesso do usuário
export const checkSubscription = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const user = req.user;
    
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

// Obter status da assinatura do usuário
router.get('/status', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    
    // Buscar a assinatura do usuário
    const payment = await Payment.findOne({
      where: { user_id: userId },
      order: [['subscription_expiration', 'DESC']], // Busca a assinatura mais recente
      transaction: t
    });
    
    if (!payment) {
      await t.commit();
      return res.json({ 
        hasSubscription: false, 
        message: 'Você não possui uma assinatura ativa.'
      });
    }
    
    const now = new Date();
    const isActive = payment.subscription_expiration > now;
    
    await t.commit();
    
    return res.json({
      hasSubscription: isActive,
      expiresAt: payment.subscription_expiration,
      daysLeft: isActive ? 
        Math.ceil((payment.subscription_expiration - now) / (1000 * 60 * 60 * 24)) : 0,
      message: isActive ? 
        'Assinatura ativa' : 
        'Sua assinatura expirou'
    });
    
  } catch (error) {
    await t.rollback();
    console.error('Erro ao obter status da assinatura:', error);
    res.status(500).json({ message: 'Erro ao obter status da assinatura' });
  }
});

// Iniciar um novo pagamento
router.post('/create-payment', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    
    // Verificar se já existe um pagamento em processamento
    const pendingPayment = await Payment.findOne({
      where: { 
        user_id: userId,
        payment_status: 'pending'
      },
      transaction: t
    });
    
    if (pendingPayment) {
      await t.commit();
      return res.json({
        paymentId: pendingPayment.payment_id,
        message: 'Você já possui um pagamento em processamento'
      });
    }
    
    // Aqui implementaríamos a integração com o Mercado Pago
    // Por enquanto, apenas criamos um registro de pagamento pendente
    
    // Criar novo pagamento
    const payment = await Payment.create({
      user_id: userId,
      payment_status: 'pending',
      payment_amount: 99.90, // Valor da assinatura
      subscription_expiration: new Date(), // Será atualizado quando o pagamento for aprovado
    }, { transaction: t });
    
    await t.commit();
    
    return res.json({
      paymentId: payment.id,
      message: 'Pagamento criado com sucesso'
    });
    
  } catch (error) {
    await t.rollback();
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento' });
  }
});

// Webhook para receber notificações do Mercado Pago
router.post('/webhook', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { data } = req.body;
    
    // Aqui implementaríamos a verificação da notificação do Mercado Pago
    // Por enquanto, apenas simulamos a aprovação de um pagamento
    
    // Buscar pagamento pelo ID
    const payment = await Payment.findOne({
      where: { id: data.id },
      transaction: t
    });
    
    if (!payment) {
      await t.rollback();
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }
    
    // Atualizar status do pagamento
    payment.payment_status = 'approved';
    payment.payment_date = new Date();
    
    // Atualizar data de expiração da assinatura (12 meses a partir da data atual ou da data de expiração, o que for maior)
    const user = await User.findByPk(payment.user_id, { transaction: t });
    const latestPayment = await Payment.findOne({
      where: { 
        user_id: user.id,
        subscription_expiration: {
          [Op.gt]: new Date()
        }
      },
      order: [['subscription_expiration', 'DESC']],
      transaction: t
    });
    
    const now = new Date();
    let newExpirationDate;
    
    if (latestPayment && latestPayment.subscription_expiration > now) {
      // Se existe uma assinatura ativa, adiciona 12 meses à data de expiração atual
      newExpirationDate = new Date(latestPayment.subscription_expiration);
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 12);
    } else {
      // Se não existe assinatura ativa ou está expirada, adiciona 12 meses à data atual
      newExpirationDate = new Date();
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 12);
    }
    
    payment.subscription_expiration = newExpirationDate;
    await payment.save({ transaction: t });
    
    await t.commit();
    
    return res.status(200).json({ message: 'Pagamento processado com sucesso' });
    
  } catch (error) {
    await t.rollback();
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ message: 'Erro ao processar webhook' });
  }
});

export default router; 