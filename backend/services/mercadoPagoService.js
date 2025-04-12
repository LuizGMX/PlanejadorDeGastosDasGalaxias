import mercadopago from 'mercadopago';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { Payment, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

dotenv.config();

// Verificar se o token está definido
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) {
  console.error('ERRO: MERCADO_PAGO_ACCESS_TOKEN não está definido no arquivo .env!');
} else {
  console.log('MERCADO_PAGO_ACCESS_TOKEN encontrado:', accessToken.substring(0, 10) + '...');
  
  // Verificar o formato do token
  if (!accessToken.startsWith('APP_USR-') && !accessToken.startsWith('TEST-')) {
    console.warn('AVISO: O formato do token do Mercado Pago parece incorreto. Deveria começar com APP_USR- (produção) ou TEST- (teste)');
  } else {
    console.log('Formato do token parece correto:', accessToken.startsWith('APP_USR-') ? 'Produção' : 'Teste');
  }
}

// Preço da assinatura anual
const SUBSCRIPTION_PRICE = parseFloat(process.env.SUBSCRIPTION_PRICE) || 99.90;

/**
 * Cria um pagamento no Mercado Pago
 * @param {Object} userData - Dados do usuário
 * @returns {Object} - Dados do pagamento criado
 */
export const createPayment = async (userData) => {
  try {
    const { userId, userName, userEmail } = userData;
    
    // Verificar se já existe um pagamento pendente
    const pendingPayment = await Payment.findOne({
      where: {
        user_id: userId,
        payment_status: 'pending'
      }
    });
    
    // Se já existe um pagamento pendente, retorna os dados dele
    if (pendingPayment && pendingPayment.payment_id) {
      try {
        // Verifica se o pagamento ainda existe no Mercado Pago
        const mpPayment = new mercadopago.Payment();
        mpPayment.setAccessToken(accessToken);
        const response = await mpPayment.get(pendingPayment.payment_id);
        
        // Se o pagamento existe e ainda está pendente, retorna os dados
        if (response.body.status === 'pending') {
          // Tenta gerar o QR code novamente, se disponível
          let qrCode = null;
          if (response.body.point_of_interaction && response.body.point_of_interaction.transaction_data && response.body.point_of_interaction.transaction_data.qr_code) {
            qrCode = await QRCode.toDataURL(response.body.point_of_interaction.transaction_data.qr_code);
          }
          
          return {
            paymentId: pendingPayment.payment_id,
            status: response.body.status,
            qrCode,
            qrCodeBase64: response.body.point_of_interaction?.transaction_data?.qr_code_base64 || null,
            qrCodeText: response.body.point_of_interaction?.transaction_data?.qr_code || null,
            paymentUrl: response.body.point_of_interaction?.transaction_data?.ticket_url || null,
            message: 'Pagamento pendente encontrado'
          };
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento pendente no Mercado Pago:', error);
        // Se houver erro ao consultar o MP, vamos assumir que o pagamento não é mais válido
        // e criar um novo
      }
    }
    
    // Criação de um novo pagamento
    console.log('Iniciando criação da preferência para o usuário:', userId);
    
    const preference = {
      items: [
        {
          title: 'Assinatura Anual - Planejador de Gastos das Galáxias',
          unit_price: SUBSCRIPTION_PRICE,
          quantity: 1,
          currency_id: 'BRL',
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
    };
    
    try {
      console.log('Enviando request para Mercado Pago...');
      const mpPreference = new mercadopago.Preference();
      mpPreference.setAccessToken(accessToken);
      
      const response = await mpPreference.create(preference);
      console.log('Preferência criada com sucesso, ID:', response.body.id);
      
      // Cria um registro de pagamento no banco de dados
      const payment = await Payment.create({
        user_id: userId,
        payment_status: 'pending',
        payment_id: response.body.id, // ID da preferência de pagamento
        payment_amount: SUBSCRIPTION_PRICE,
        payment_method: 'mercado_pago',
        subscription_expiration: new Date() // Será atualizado quando o pagamento for aprovado
      });
      
      // Tenta gerar QR code, se disponível
      let qrCode = null;
      if (response.body.point_of_interaction && response.body.point_of_interaction.transaction_data && response.body.point_of_interaction.transaction_data.qr_code) {
        qrCode = await QRCode.toDataURL(response.body.point_of_interaction.transaction_data.qr_code);
      }
      
      return {
        paymentId: payment.payment_id,
        preferenceId: response.body.id,
        initPoint: response.body.init_point,
        qrCode,
        qrCodeBase64: response.body.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        qrCodeText: response.body.point_of_interaction?.transaction_data?.qr_code || null,
        paymentUrl: response.body.point_of_interaction?.transaction_data?.ticket_url || null,
        message: 'Pagamento criado com sucesso'
      };
    } catch (mpError) {
      console.error('Erro ao criar preferência no Mercado Pago:', {
        mensagem: mpError.message,
        causa: mpError.cause || 'Sem causa especificada',
        statusCode: mpError.status || 'Sem status',
        detalhe: mpError.error || 'Sem detalhes adicionais'
      });
      throw mpError;
    }
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    throw new Error(`Falha ao criar pagamento: ${error.message}`);
  }
};

/**
 * Verifica o status de um pagamento no Mercado Pago
 * @param {string} paymentId - ID do pagamento
 * @returns {Object} - Status do pagamento
 */
export const checkPaymentStatus = async (paymentId) => {
  try {
    const mpPayment = new mercadopago.Payment();
    mpPayment.setAccessToken(accessToken);
    
    const response = await mpPayment.get(paymentId);
    
    return {
      status: response.body.status,
      statusDetail: response.body.status_detail,
      paymentMethod: response.body.payment_method_id,
      paymentAmount: response.body.transaction_amount,
      dateCreated: response.body.date_created,
      dateLastUpdated: response.body.date_last_updated
    };
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    throw new Error(`Falha ao verificar status do pagamento: ${error.message}`);
  }
};

/**
 * Processa o webhook de pagamento recebido do Mercado Pago
 * @param {Object} data - Dados do webhook
 * @returns {Object} - Resultado do processamento
 */
export const processPaymentWebhook = async (data) => {
  const t = await sequelize.transaction();
  
  try {
    if (data.type !== 'payment') {
      await t.commit();
      return { message: 'Evento ignorado, não é um pagamento' };
    }
    
    // Busca os detalhes do pagamento no Mercado Pago
    const mpPayment = new mercadopago.Payment();
    mpPayment.setAccessToken(accessToken);
    
    const response = await mpPayment.get(data.data.id);
    const paymentInfo = response.body;
    
    // Verifica se o pagamento está relacionado a uma preferência existente
    let dbPayment = await Payment.findOne({
      where: { payment_id: paymentInfo.external_reference || paymentInfo.preference_id },
      transaction: t
    });
    
    if (!dbPayment) {
      // Se não encontrar pelo external_reference, busca pelo metadata
      const userId = paymentInfo.metadata?.user_id;
      if (userId) {
        // Busca o pagamento pendente mais recente do usuário
        const pendingPayment = await Payment.findOne({
          where: { 
            user_id: userId,
            payment_status: 'pending'
          },
          order: [['created_at', 'DESC']],
          transaction: t
        });
        
        if (pendingPayment) {
          // Atualiza o payment_id com o ID real do pagamento
          pendingPayment.payment_id = data.data.id;
          await pendingPayment.save({ transaction: t });
          
          // Atualiza a referência para processamento
          dbPayment = pendingPayment;
        }
      }
      
      // Se mesmo assim não encontrar, cria um log e retorna
      if (!dbPayment) {
        console.warn('Pagamento não encontrado no sistema:', data.data.id);
        await t.commit();
        return { message: 'Pagamento não encontrado no sistema' };
      }
    }
    
    // Atualiza o status do pagamento com base na resposta do Mercado Pago
    dbPayment.payment_status = paymentInfo.status;
    dbPayment.payment_method = paymentInfo.payment_method_id;
    dbPayment.payment_date = new Date(paymentInfo.date_approved || paymentInfo.date_created);
    
    // Se o pagamento foi aprovado, atualiza a data de expiração da assinatura
    if (paymentInfo.status === 'approved') {
      const user = await User.findByPk(dbPayment.user_id, { transaction: t });
      
      // Busca a assinatura ativa mais recente (se existir)
      const latestPayment = await Payment.findOne({
        where: { 
          user_id: user.id,
          subscription_expiration: {
            [Op.gt]: new Date()
          },
          payment_status: 'approved'
        },
        order: [['subscription_expiration', 'DESC']],
        transaction: t
      });
      
      let newExpirationDate;
      
      if (latestPayment && latestPayment.subscription_expiration > new Date()) {
        // Se existe uma assinatura ativa, adiciona 12 meses à data de expiração atual
        newExpirationDate = new Date(latestPayment.subscription_expiration);
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 12);
      } else {
        // Se não existe assinatura ativa ou está expirada, adiciona 12 meses à data atual
        newExpirationDate = new Date();
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 12);
      }
      
      dbPayment.subscription_expiration = newExpirationDate;
    }
    
    await dbPayment.save({ transaction: t });
    await t.commit();
    
    return { 
      message: 'Pagamento processado com sucesso',
      status: paymentInfo.status,
      subscription_expiration: dbPayment.subscription_expiration
    };
  } catch (error) {
    await t.rollback();
    console.error('Erro ao processar webhook de pagamento:', error);
    throw new Error(`Falha ao processar webhook de pagamento: ${error.message}`);
  }
};

export default {
  createPayment,
  checkPaymentStatus,
  processPaymentWebhook
}; 