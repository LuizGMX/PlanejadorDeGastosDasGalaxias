import { User, Payment } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import mercadoPagoService from '../services/mercadoPagoService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Obtém o status da assinatura do usuário
 */
export const getSubscriptionStatus = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    
    // Buscar a assinatura mais recente do usuário, aprovada ou pendente
    const payment = await Payment.findOne({
      where: { 
        user_id: userId,
        [Op.or]: [
          { payment_status: 'approved' },
          { payment_status: 'pending' }
        ]
      },
      order: [
        ['payment_status', 'ASC'], // 'approved' vem antes de 'pending'
        ['subscription_expiration', 'DESC']
      ],
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
    
    // Se é um pagamento pendente
    if (payment.payment_status === 'pending') {
      await t.commit();
      
      // Tenta obter status atualizado do Mercado Pago
      try {
        if (payment.payment_id) {
          const mpStatus = await mercadoPagoService.checkPaymentStatus(payment.payment_id);
          
          // Se o pagamento foi aprovado no MP mas ainda está pendente no sistema
          if (mpStatus.status === 'approved') {
            // Atualiza o pagamento no sistema (fora da transação atual)
            await Payment.update({
              payment_status: 'approved',
              payment_date: new Date(),
              subscription_expiration: new Date(now.setMonth(now.getMonth() + 12))
            }, {
              where: { id: payment.id }
            });
            
            return res.json({
              hasSubscription: true,
              isPending: false,
              expiresAt: new Date(now.setMonth(now.getMonth() + 12)),
              daysLeft: 365,
              message: 'Pagamento aprovado! Sua assinatura foi ativada.'
            });
          }
          
          // Se ainda está pendente
          return res.json({
            hasSubscription: false,
            isPending: true,
            paymentId: payment.payment_id,
            paymentStatus: mpStatus.status,
            message: 'Seu pagamento está sendo processado'
          });
        }
      } catch (mpError) {
        console.error('Erro ao verificar status no Mercado Pago:', mpError);
        // Continua com a resposta padrão em caso de erro
      }
      
      return res.json({
        hasSubscription: false,
        isPending: true,
        paymentId: payment.payment_id,
        message: 'Seu pagamento está sendo processado'
      });
    }
    
    // Se é um pagamento aprovado, verifica se ainda é válido
    const isActive = payment.subscription_expiration > now;
    
    await t.commit();
    
    if (isActive) {
      // Calcula quantos dias faltam para expirar
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysLeft = Math.round((payment.subscription_expiration - now) / msPerDay);
      
      return res.json({
        hasSubscription: true,
        isPending: false,
        expiresAt: payment.subscription_expiration,
        daysLeft,
        message: daysLeft <= 7 
          ? `Sua assinatura expira em ${daysLeft} dias. Considere renovar.` 
          : 'Você possui uma assinatura ativa.'
      });
    } else {
      return res.json({
        hasSubscription: false,
        isExpired: true,
        lastExpiration: payment.subscription_expiration,
        message: 'Sua assinatura expirou. Por favor, renove para continuar usando o sistema.'
      });
    }
  } catch (error) {
    await t.rollback();
    console.error('Erro ao verificar status da assinatura:', error);
    res.status(500).json({ message: 'Erro ao verificar status da assinatura', error: error.message });
  }
};

/**
 * Cria um novo pagamento usando o Mercado Pago
 */
export const createPayment = async (req, res) => {
  try {
    const user = req.user;
    
    // Criar um novo pagamento usando o serviço do Mercado Pago
    const paymentData = await mercadoPagoService.createPayment({
      userId: user.id,
      userName: user.name,
      userEmail: user.email
    });
    
    return res.json({
      ...paymentData,
      message: 'Pagamento criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento', error: error.message });
  }
};

/**
 * Verifica o status de um pagamento específico
 */
export const checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    
    // Verificar se o pagamento pertence ao usuário
    const payment = await Payment.findOne({
      where: {
        payment_id: paymentId,
        user_id: userId
      }
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }
    
    // Verificar status no Mercado Pago
    const paymentStatus = await mercadoPagoService.checkPaymentStatus(paymentId);
    
    // Se o status no MP for diferente do status no banco, atualiza
    if (paymentStatus.status !== payment.payment_status) {
      // Atualiza o status no banco
      await Payment.update({
        payment_status: paymentStatus.status,
        payment_date: paymentStatus.status === 'approved' ? new Date() : payment.payment_date
      }, {
        where: { id: payment.id }
      });
      
      // Se foi aprovado, atualiza a data de expiração
      if (paymentStatus.status === 'approved' && payment.payment_status !== 'approved') {
        const now = new Date();
        const expirationDate = new Date(now.setMonth(now.getMonth() + 12));
        
        await Payment.update({
          subscription_expiration: expirationDate
        }, {
          where: { id: payment.id }
        });
        
        paymentStatus.subscriptionExpiration = expirationDate;
      }
    }
    
    return res.json({
      ...paymentStatus,
      message: 'Status do pagamento verificado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ message: 'Erro ao verificar status do pagamento', error: error.message });
  }
};

/**
 * Processa o webhook recebido do Mercado Pago
 */
export const processPaymentWebhook = async (req, res) => {
  try {
    console.log('Webhook do Mercado Pago recebido:', req.body);
    
    // Valida o segredo do webhook, se configurado
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const receivedSecret = req.headers['x-webhook-secret'];
      if (receivedSecret !== webhookSecret) {
        console.error('Webhook com segredo inválido:', receivedSecret);
        return res.status(403).json({ message: 'Segredo de webhook inválido' });
      }
    }
    
    // Processa o webhook
    const result = await mercadoPagoService.processPaymentWebhook(req.body);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Retorna 200 mesmo em caso de erro para o Mercado Pago não reenviar
    return res.status(200).json({ message: 'Erro processado', error: error.message });
  }
};

/**
 * Handler para sucesso no pagamento
 */
export const handlePaymentSuccess = async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;
    
    console.log('Retorno de pagamento bem-sucedido:', { payment_id, status, external_reference });
    
    // Verifica e atualiza o status do pagamento se necessário
    if (payment_id) {
      const paymentStatus = await mercadoPagoService.checkPaymentStatus(payment_id);
      
      if (paymentStatus.status === 'approved') {
        // Encontra o pagamento no sistema
        const payment = await Payment.findOne({
          where: {
            [Op.or]: [
              { payment_id: payment_id },
              { payment_id: external_reference }
            ]
          }
        });
        
        if (payment) {
          // Atualiza o status apenas se ainda não estiver aprovado
          if (payment.payment_status !== 'approved') {
            const now = new Date();
            const expirationDate = new Date(now.setMonth(now.getMonth() + 12));
            
            await Payment.update({
              payment_status: 'approved',
              payment_date: new Date(),
              subscription_expiration: expirationDate
            }, {
              where: { id: payment.id }
            });
          }
        }
      }
    }
    
    // Redireciona para a página de pagamento do frontend
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=success`);
  } catch (error) {
    console.error('Erro ao processar retorno de pagamento:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=error`);
  }
};

/**
 * Handler para falha no pagamento
 */
export const handlePaymentFailure = async (req, res) => {
  try {
    console.log('Retorno de pagamento com falha:', req.query);
    
    // Redireciona para a página de pagamento do frontend
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=failure`);
  } catch (error) {
    console.error('Erro ao processar retorno de pagamento com falha:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=error`);
  }
};

/**
 * Handler para pagamento pendente
 */
export const handlePaymentPending = async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;
    
    console.log('Retorno de pagamento pendente:', { payment_id, status, external_reference });
    
    // Redireciona para a página de pagamento do frontend
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=pending`);
  } catch (error) {
    console.error('Erro ao processar retorno de pagamento pendente:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=error`);
  }
};

export default {
  getSubscriptionStatus,
  createPayment,
  checkPaymentStatus,
  processPaymentWebhook,
  handlePaymentSuccess,
  handlePaymentFailure,
  handlePaymentPending
}; 