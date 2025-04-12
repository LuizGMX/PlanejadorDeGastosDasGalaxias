import { Router } from 'express';
import dotenv from 'dotenv';
import { User, Payment } from '../models/index.js';
import { authenticate } from './auth.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import pkg from 'mercadopago';
const { MercadoPagoConfig, Preference } = pkg;

dotenv.config();
const router = Router();

// Constante com o preço da assinatura
const SUBSCRIPTION_PRICE = 99.90;

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

// Obter status da assinatura do usuário
router.get('/status', authenticate, async (req, res) => {
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
          const mpStatus = await checkPaymentStatus(payment.payment_id);
          
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
    
    return res.json({
      hasSubscription: isActive,
      isPending: false,
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

// Função para verificar o status de um pagamento no Mercado Pago
const checkPaymentStatus = async (paymentId) => {
  try {
    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao verificar pagamento: ${response.status}`);
    }
    
    const paymentData = await response.json();
    
    return {
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      paymentMethod: paymentData.payment_method_id,
      externalReference: paymentData.external_reference
    };
  } catch (error) {
    console.error('Erro ao verificar status do pagamento no Mercado Pago:', error);
    throw error;
  }
};

// Iniciar um novo pagamento com Mercado Pago
router.post('/create-payment', authenticate, async (req, res) => {
  try {
    const user = req.user;
    
    // Buscar informações do usuário
    const userInfo = await User.findByPk(user.id);
    
    if (!userInfo) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    const userName = userInfo.name || 'Usuário';
    const userEmail = userInfo.email;
    const userId = userInfo.id;
    
    // Configurar cliente do Mercado Pago
    // const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
    const client = new MercadoPagoConfig({ accessToken: "TEST-6843259428100870-092419-deed0d1c053a9c2d56093554d6a039c2-115322747" });
    const preference = new Preference(client);
    
    // Criar preferência de pagamento
    const preferenceData = await preference.create({
      body: {
        items: [
          {
            title: 'Assinatura Anual - Planejador de Gastos das Galáxias',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: SUBSCRIPTION_PRICE,
            description: 'Acesso premium por 12 meses ao Planejador de Gastos das Galáxias'
          }
        ],
        payer: {
          name: userName,
          email: userEmail
        },
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' } // Excluir pagamento por boleto
          ],
          installments: 1, // Parcelas
          default_installments: 1
        },
        // URLs de retorno
        back_urls: {
          success: `${process.env.FRONTEND_URL}/payment/success`,
          failure: `${process.env.FRONTEND_URL}/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        statement_descriptor: 'PLANEJADORGALAXIAS',
        notification_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL?.replace('3000', '5000') || 'https://planejadordasgalaxias.com.br'}/payments/webhook`,
        metadata: {
          user_id: userId
        }
      }
    });
    
    // Retornar dados do pagamento para o frontend
    return res.json({
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,
      qrCode: preferenceData.point_of_interaction?.transaction_data?.qr_code_base64,
      qrCodeText: preferenceData.point_of_interaction?.transaction_data?.qr_code,
      paymentUrl: preferenceData.init_point,
      message: 'Pagamento criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento', error: error.message });
  }
});

// Verificar status de um pagamento específico
router.get('/check-payment/:paymentId', authenticate, async (req, res) => {
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
    const paymentStatus = await checkPaymentStatus(paymentId);
    
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
});

// Webhook para receber notificações do Mercado Pago
router.post('/webhook', async (req, res) => {
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
    
    // Extrair dados relevantes do webhook
    const { data, type } = req.body;
    
    // Processar apenas notificações de pagamento
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obter detalhes do pagamento
      try {
        const paymentStatus = await checkPaymentStatus(paymentId);
        
        // Buscar pagamento associado no banco de dados
        const payment = await Payment.findOne({
          where: {
            [Op.or]: [
              { payment_id: paymentId },
              { payment_id: paymentStatus.externalReference }
            ]
          }
        });
        
        if (payment) {
          // Atualizar status do pagamento
          await Payment.update({
            payment_status: paymentStatus.status,
            payment_date: paymentStatus.status === 'approved' ? new Date() : payment.payment_date
          }, {
            where: { id: payment.id }
          });
          
          // Se foi aprovado, atualizar a data de expiração
          if (paymentStatus.status === 'approved' && payment.payment_status !== 'approved') {
            const now = new Date();
            const expirationDate = new Date(now.setMonth(now.getMonth() + 12));
            
            await Payment.update({
              subscription_expiration: expirationDate
            }, {
              where: { id: payment.id }
            });
          }
        } else {
          console.log('Pagamento não encontrado no sistema para o ID:', paymentId);
        }
      } catch (error) {
        console.error('Erro ao processar notificação de pagamento:', error);
      }
    }
    
    // Responde com sucesso para o Mercado Pago
    return res.status(200).json({ message: 'Webhook processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Retorna 200 mesmo em caso de erro para o Mercado Pago não reenviar
    return res.status(200).json({ message: 'Erro processado', error: error.message });
  }
});

// Página de sucesso após pagamento
router.get('/success', authenticate, async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;
    
    console.log('Retorno de pagamento bem-sucedido:', { payment_id, status, external_reference });
    
    // Verifica e atualiza o status do pagamento se necessário
    if (payment_id) {
      const paymentStatus = await checkPaymentStatus(payment_id);
      
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
});

// Página de falha após pagamento
router.get('/failure', authenticate, async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;
    
    console.log('Retorno de pagamento com falha:', { payment_id, status, external_reference });
    
    // Atualiza o status do pagamento se necessário
    if (payment_id) {
      await Payment.update({
        payment_status: 'rejected'
      }, {
        where: {
          [Op.or]: [
            { payment_id: payment_id },
            { payment_id: external_reference }
          ]
        }
      });
    }
    
    // Redireciona para a página de pagamento do frontend
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=failure`);
  } catch (error) {
    console.error('Erro ao processar retorno de pagamento com falha:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=error`);
  }
});

// Página de pagamento pendente
router.get('/pending', authenticate, async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;
    
    console.log('Retorno de pagamento pendente:', { payment_id, status, external_reference });
    
    // Redireciona para a página de pagamento do frontend
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=pending`);
  } catch (error) {
    console.error('Erro ao processar retorno de pagamento pendente:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment?status=error`);
  }
});

export default router; 