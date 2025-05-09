import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import {models} from '../models/index.js';
const {User, VerificationCode, UserBank, Bank, Payment, FinancialGoal} = models;

import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { sendVerificationEmail } from '../services/emailService.js';

dotenv.config();

const router = Router();

// Utility Functions
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateJWT = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware de autenticação
export const authenticate = async (req, res, next) => {
  console.log(`INICIANDO ${process.env.API_PREFIX}/auth/authenticate middleware`);
  const t = await sequelize.transaction();
  
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      await t.rollback();
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      await t.rollback();
      return res.status(401).json({ message: 'Token mal formatado' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, { transaction: t });
      
      if (!user) {
        await t.rollback();
        return res.status(401).json({ message: 'Usuário não encontrado' });
      }

      req.user = user;
      await t.commit();
      next();
    } catch (jwtError) {
      await t.rollback();
      console.error('Erro na verificação do JWT:', {
        error: jwtError.message,
        name: jwtError.name,
        stack: jwtError.stack,
        token: token.substring(0, 10) + '...' // Log apenas parte do token por segurança
      });

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token inválido' });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      throw jwtError;
    }
  } catch (error) {
    await t.rollback();
    console.error('Erro detalhado na autenticação:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      headers: req.headers
    });
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  } finally {
    console.log(`FINALIZANDO ${process.env.API_PREFIX}/auth/authenticate middleware`);
  }
};

// Rotas
router.post('/check-email', async (req, res) => {
  console.log('===========================================');
  console.log('INICIANDO /auth/check-email');
  console.log('Timestamp:', new Date().toISOString());
  
  // Configurar um timeout para a requisição caso fique presa
  const timeoutDuration = 10000; // 10 segundos
  let hasResponded = false;
  
  const requestTimeout = setTimeout(() => {
    if (!hasResponded) {
      console.log('TIMEOUT: A requisição check-email demorou demais para responder');
      hasResponded = true;
      return res.status(200).json({
        isNewUser: false,
        timeout: true,
        message: 'A verificação de email demorou muito tempo. Por favor, tente novamente.'
      });
    }
  }, timeoutDuration);
  
  try {
    const { email } = req.body;
    console.log('Email extraído do body:', email);
    
    if (!email) {
      console.log('ERRO: Email não fornecido');
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(400).json({ message: 'E-mail é obrigatório' });
    }
    
    // Verifica se o email é válido
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.log('ERRO: Email inválido:', email);
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(400).json({ message: 'E-mail inválido' });
    }
    
    console.log('Buscando usuário no banco de dados...');
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'name', 'email']
    });
    
    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
    if (user) {
      console.log('Detalhes do usuário encontrado (ID, Nome):', user.id, user.name);
    }
    
    // Se o usuário existir, gera e envia o código imediatamente
    if (user) {
      try {
        console.log('Gerando código para usuário existente...');
        const code = generateVerificationCode();
        console.log('Código gerado:', code);

        console.log('Removendo códigos antigos...');
        await VerificationCode.destroy({ where: { email } });
        
        console.log('Salvando novo código...');
        await VerificationCode.create({
          email,
          code,
          expires_at: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Enviar email em background e não esperar pela conclusão
        console.log('Enviando email em segundo plano...');
        sendVerificationEmail(email, code).catch(emailError => {
          console.error('ERRO ao enviar email (não bloqueante):', emailError);
        });

        console.log('Retornando resposta de sucesso para usuário existente');
        clearTimeout(requestTimeout);
        hasResponded = true;
        return res.json({
          isNewUser: false,
          name: user.name,
          email: user.email,
          message: 'Código enviado com sucesso!'
        });
      } catch (userExistsError) {
        console.error('ERRO no fluxo de usuário existente:', userExistsError);
        console.error('Stack trace:', userExistsError.stack);
        clearTimeout(requestTimeout);
        hasResponded = true;
        return res.status(500).json({ message: 'Erro interno ao processar usuário existente' });
      }
    }
    
    // Se não existir, retorna que é um novo usuário
    console.log('Retornando resposta para novo usuário');
    clearTimeout(requestTimeout);
    hasResponded = true;
    return res.json({
      isNewUser: true,
      name: null,
      email: null
    });
  } catch (error) {
    console.error('ERRO CRÍTICO ao verificar email:', error);
    console.error('Stack trace completo:', error.stack);
    console.error('Tipo de erro:', error.name);
    console.error('Mensagem de erro:', error.message);
    
    if (!hasResponded) {
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(500).json({ message: 'Erro interno ao verificar email', error: error.message });
    }
  } finally {
    // Garantir que o timeout seja limpo caso a função saia antes
    clearTimeout(requestTimeout);
    console.log('FINALIZANDO /auth/check-email');
    console.log('===========================================');
  }
});

router.post('/send-code', async (req, res) => {
  console.log('===========================================');
  console.log('INICIANDO /auth/send-code');
  console.log('Timestamp:', new Date().toISOString());
  
  // Configurar um timeout para a requisição caso fique presa
  const timeoutDuration = 10000; // 10 segundos
  let hasResponded = false;
  
  const requestTimeout = setTimeout(() => {
    if (!hasResponded) {
      console.log('TIMEOUT: A requisição send-code demorou demais para responder');
      hasResponded = true;
      return res.status(200).json({
        timeout: true,
        message: 'O envio do código demorou muito tempo. Por favor, tente novamente.'
      });
    }
  }, timeoutDuration);
  
  try {
    const { 
      email, 
      name,      
      financialGoalName,
      financialGoalAmount,
      financialGoalPeriodType,
      financialGoalPeriodValue,
      selectedBanks,
      isNewUser
    } = req.body;

    console.log('Dados recebidos:', { 
      email, 
      name,      
      financialGoalName,
      financialGoalAmount,
      financialGoalPeriodType,
      financialGoalPeriodValue,
      selectedBanks: selectedBanks ? selectedBanks.length : 0,
      isNewUser 
    });

    // Validação básica do email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    // Se for novo usuário, valida os dados necessários
    if (isNewUser && (!name || !financialGoalName || !financialGoalAmount || !financialGoalPeriodType || !financialGoalPeriodValue)) {
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(400).json({ message: 'Todos os dados são obrigatórios para novos usuários' });
    }

    // Gera o código de verificação
    const code = generateVerificationCode();
    console.log('Código gerado:', code);

    // Remove códigos antigos
    await VerificationCode.destroy({ where: { email } });

    // Prepara os dados do usuário para salvar com o código
    const userData = isNewUser ? {
      name,
      financialGoalName,
      financialGoalAmount,
      financialGoalPeriodType,
      financialGoalPeriodValue,
      selectedBanks
    } : null;

    // Salva o código com os dados do usuário
    await VerificationCode.create({
      email,
      code,
      user_data: userData ? JSON.stringify(userData) : null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    });

    // Enviar email em background e não esperar pela conclusão
    console.log('Enviando email em segundo plano...');
    sendVerificationEmail(email, code).catch(emailError => {
      console.error('ERRO ao enviar email (não bloqueante):', emailError);
    });

    clearTimeout(requestTimeout);
    hasResponded = true;
    return res.json({ message: 'Código enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    
    if (!hasResponded) {
      clearTimeout(requestTimeout);
      hasResponded = true;
      return res.status(500).json({ message: error.message || 'Erro interno ao enviar código' });
    }
  } finally {
    // Garantir que o timeout seja limpo caso a função saia antes
    clearTimeout(requestTimeout);
    console.log('FINALIZANDO /auth/send-code');
    console.log('===========================================');
  }
});

router.post('/verify-code', async (req, res) => {
  console.log('===========================================');
  console.log('INICIANDO /auth/verify-code');
  console.log('Timestamp:', new Date().toISOString());
  
  // Configurar um timeout para a requisição caso fique presa
  const timeoutDuration = 10000; // 10 segundos
  let hasResponded = false;
  let t = null;
  
  const requestTimeout = setTimeout(() => {
    if (!hasResponded) {
      console.log('TIMEOUT: A requisição verify-code demorou demais para responder');
      hasResponded = true;
      
      // Rollback da transação se existir
      if (t) {
        t.rollback().catch(err => console.error('Erro ao fazer rollback:', err));
      }
      
      return res.status(200).json({
        timeout: true,
        message: 'A verificação do código demorou muito tempo. Por favor, tente novamente.'
      });
    }
  }, timeoutDuration);
  
  try {
    const { 
      email, 
      code, 
      isNewUser, 
      name,
      financialGoalName,
      financialGoalAmount,
      financialGoalPeriodType,
      financialGoalPeriodValue,
      selectedBanks 
    } = req.body;

    console.log('Dados recebidos no verify-code:', {
      email,
      isNewUser,
      selectedBanks: selectedBanks ? selectedBanks.length : 0
    });

    // Iniciar transação com timeout
    try {
      t = await sequelize.transaction();
    } catch (dbError) {
      console.error('Erro ao iniciar transação:', dbError.message);
      clearTimeout(requestTimeout);
      hasResponded = true;
      
      // Em ambiente de desenvolvimento, ainda podemos retornar uma resposta simulada
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️ Gerando resposta simulada para desenvolvimento');
        
        return res.json({
          simulated: true,
          token: 'dev_token_' + Date.now(),
          user: {
            id: 1,
            name: name || 'Usuário Teste',
            email: email || 'teste@example.com'
          }
        });
      }
      
      return res.status(500).json({ 
        message: 'Erro de conexão ao banco de dados. Por favor, tente novamente.' 
      });
    }

    try {
      // Validação do código de verificação
      const verificationCode = await VerificationCode.findOne({
        where: {
          email,
          code,
          expires_at: { [Op.gt]: new Date() }
        },
        transaction: t
      });

      if (!verificationCode) {
        await t.rollback();
        clearTimeout(requestTimeout);
        hasResponded = true;
        return res.status(400).json({ message: 'Código inválido ou expirado' });
      }

      // Busca o usuário
      let user = await User.findOne({ where: { email }, transaction: t });

      // Se for um novo usuário, cria o usuário
      if (isNewUser && !user) {
        try {
          user = await User.create({
            email,
            name,
            desired_budget: financialGoalAmount || 0
          }, { transaction: t });
        } catch (createUserError) {
          console.error('Erro ao criar usuário:', createUserError);
          await t.rollback();
          clearTimeout(requestTimeout);
          hasResponded = true;
          return res.status(500).json({ message: 'Erro ao criar novo usuário' });
        }

        // Se houver meta financeira, cria
        if (financialGoalName && financialGoalAmount) {
          // Calcular a data de término baseada no período
          const startDate = new Date();
          let endDate = new Date(startDate);
          
          if (financialGoalPeriodType && financialGoalPeriodValue) {
            const periodValue = parseInt(financialGoalPeriodValue);
            
            switch (financialGoalPeriodType) {
              case 'days':
                endDate.setDate(startDate.getDate() + periodValue);
                break;
              case 'months':
                endDate.setMonth(startDate.getMonth() + periodValue);
                break;
              case 'years':
                endDate.setFullYear(startDate.getFullYear() + periodValue);
                break;
              default:
                endDate.setFullYear(startDate.getFullYear() + 1); // Padrão: 1 ano
            }
          } else {
            // Se não tiver período definido, define 1 ano como padrão
            endDate.setFullYear(startDate.getFullYear() + 1);
          }
          
          try {
            await FinancialGoal.create({
              user_id: user.id,
              name: financialGoalName,
              amount: financialGoalAmount,
              period_type: financialGoalPeriodType || 'years',
              period_value: financialGoalPeriodValue || 1,
              start_date: startDate,
              end_date: endDate
            }, { transaction: t });
          } catch (goalError) {
            console.error('Erro ao criar meta financeira:', goalError);
            // Não cancelamos a operação por falha na criação da meta
          }
        }

        // Criar registro de pagamento inicial com 7 dias gratuitos
        const trialExpirationDate = new Date();
        trialExpirationDate.setDate(trialExpirationDate.getDate() + 7); // 7 dias de teste
        
        try {
          await Payment.create({
            user_id: user.id,
            subscription_expiration: trialExpirationDate,
            payment_status: 'approved',
            payment_method: 'trial',
            payment_amount: 0,
            payment_date: new Date()
          }, { transaction: t });
        } catch (paymentError) {
          console.error('Erro ao criar registro de pagamento inicial:', paymentError);
          // Não cancelamos a operação por falha na criação do pagamento
        }
      }

      // Associar bancos ao usuário, se houver
      if (selectedBanks && selectedBanks.length > 0 && user) {
        console.log('Associando bancos ao usuário:', { userId: user.id, selectedBanks });
        
        try {
          // Pegar todos os bancos existentes para ter certeza de quais devem ser ativos e inativos
          const allBanks = await Bank.findAll({
            attributes: ['id'],
            transaction: t
          });
          
          // Para cada banco no sistema
          for (const bank of allBanks) {
            // Verificar se o banco está na lista de selecionados
            const isSelected = selectedBanks.includes(bank.id);
            
            // Remover qualquer associação existente primeiro
            await UserBank.destroy({
              where: { 
                user_id: user.id, 
                bank_id: bank.id 
              },
              transaction: t
            });
            
            // Criar associação para todos os bancos, mas marcando como ativo apenas os selecionados
            await UserBank.create({
              user_id: user.id,
              bank_id: bank.id,
              is_active: isSelected // true para selecionados, false para não selecionados
            }, { 
              transaction: t
            });
            
            console.log(`Banco ${bank.id} associado com is_active=${isSelected}`);
          }
          
          console.log('Bancos associados com sucesso');
        } catch (bankError) {
          console.error('Erro ao associar bancos:', bankError);
          // Não fazemos rollback aqui, pois isso não é crítico
        }
      }

      // Remove o código de verificação
      await verificationCode.destroy({ transaction: t });

      // Gera o token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Commit da transação
      await t.commit();
      t = null; // Evitar rollback

      clearTimeout(requestTimeout);
      hasResponded = true;
      res.json({ 
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telegram_verified: user.telegram_verified
        }
      });
    } catch (error) {
      console.error('Erro ao verificar código:', error);
      
      if (t) {
        try {
          await t.rollback();
        } catch (rollbackError) {
          console.error('Erro ao fazer rollback:', rollbackError);
        }
      }
      
      if (!hasResponded) {
        clearTimeout(requestTimeout);
        hasResponded = true;
        res.status(500).json({ message: 'Erro ao verificar código' });
      }
    }
  } catch (error) {
    console.error('Erro global ao verificar código:', error);
    
    if (t) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error('Erro ao fazer rollback:', rollbackError);
      }
    }
    
    if (!hasResponded) {
      clearTimeout(requestTimeout);
      hasResponded = true;
      res.status(500).json({ message: 'Erro ao processar a solicitação' });
    }
  } finally {
    // Garantir que o timeout seja limpo
    clearTimeout(requestTimeout);
    
    // Se ainda tem uma transação ativa, fazer rollback
    if (t) {
      try {
        await t.rollback();
      } catch (rollbackError) {
        console.error('Erro ao fazer rollback final:', rollbackError);
      }
    }
    
    console.log('FINALIZANDO /auth/verify-code');
    console.log('===========================================');
  }
});

router.post('/send-access-code', async (req, res) => {
  console.log('/${process.env.API_PREFIX}/auth/send-access-code chamado');
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Gera o código de verificação
    const code = generateVerificationCode();
    
    // Remove códigos antigos
    await VerificationCode.destroy({ where: { email } });
    
    // Cria novo código
    await VerificationCode.create({ 
      email, 
      code, 
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    });

    // Envia o email
    await sendVerificationEmail(email, code);

    // Log para debug
    console.log('=================================');
    console.log(`Novo código de acesso para ${email}: ${code}`);
    console.log('=================================');

    return res.json({ message: 'Código de acesso enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar código de acesso:', error);
    return res.status(500).json({ message: 'Erro interno ao enviar código de acesso' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  console.log('/${process.env.API_PREFIX}/auth/me chamado');
  try {
    const user = await User.findByPk(req.user.id);
    return res.json({ 
      id: user.id,
      name: user.name, 
      email: user.email,
      telegram_verified: user.telegram_verified,
      financial_goal_name: user.financial_goal_name,
      financial_goal_amount: parseInt(user.financial_goal_amount),
      financial_goal_time: user.financial_goal_time,
      desired_budget: user.desired_budget
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    console.log('=================================');
    console.log('=== ATUALIZAÇÃO DE PERFIL ===');
    console.log('Dados recebidos:', req.body);
    console.log('=================================');

    const {
      name,
      email,
      financial_goal_name,
      financial_goal_amount,
      financial_goal_period_type,
      financial_goal_period_value
    } = req.body;

    // Validação dos campos obrigatórios
    if (!name) {
      await t.rollback();
      console.log('Erro: Nome é obrigatório');
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    // Calcula as datas do objetivo financeiro
    let startDate = new Date();
    let endDate = new Date(startDate);
    
    if (financial_goal_period_type && financial_goal_period_value) {
      console.log('Calculando datas do objetivo:', { financial_goal_period_type, financial_goal_period_value });
      
      const periodValue = parseInt(financial_goal_period_value);
      if (isNaN(periodValue)) {
        await t.rollback();
        console.log('Erro: Período inválido');
        return res.status(400).json({ message: 'Período inválido' });
      }

      try {
        switch (financial_goal_period_type) {
          case 'days':
            endDate.setDate(startDate.getDate() + periodValue);
            break;
          case 'months':
            endDate.setMonth(startDate.getMonth() + periodValue);
            break;
          case 'years':
            endDate.setFullYear(startDate.getFullYear() + periodValue);
            break;
          default:
            await t.rollback();
            console.log('Erro: Tipo de período inválido');
            return res.status(400).json({ message: 'Tipo de período inválido' });
        }
      } catch (dateError) {
        await t.rollback();
        console.error('Erro ao calcular datas:', dateError);
        return res.status(400).json({ message: 'Erro ao calcular datas do objetivo' });
      }
    }

    console.log('Datas calculadas:', { startDate, endDate });

    // Processa o valor do objetivo financeiro
    let processedAmount = null;
    if (financial_goal_amount) {
      try {
        processedAmount = parseFloat(financial_goal_amount.toString().replace(/\./g, '').replace(',', '.'));
        if (isNaN(processedAmount)) {
          await t.rollback();
          console.log('Erro: Valor do objetivo inválido');
          return res.status(400).json({ message: 'Valor do objetivo inválido' });
        }
      } catch (amountError) {
        await t.rollback();
        console.error('Erro ao processar valor:', amountError);
        return res.status(400).json({ message: 'Erro ao processar valor do objetivo' });
      }
    }

    // Atualiza o usuário
    try {
      const updatedUser = await req.user.update({
        name,
        email,
        financial_goal_name: financial_goal_name || null,
        financial_goal_amount: processedAmount,
        financial_goal_start_date: startDate,
        financial_goal_end_date: endDate
      }, { transaction: t });

      await t.commit();
      console.log('Usuário atualizado:', updatedUser.toJSON());
      console.log('=================================');

      // Retorna os dados atualizados
      return res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        telegram_verified: updatedUser.telegram_verified,
        financial_goal_name: updatedUser.financial_goal_name,
        financial_goal_amount: updatedUser.financial_goal_amount,
        financial_goal_start_date: updatedUser.financial_goal_start_date,
        financial_goal_end_date: updatedUser.financial_goal_end_date,
        message: 'Perfil atualizado com sucesso!'
      });
    } catch (updateError) {
      await t.rollback();
      console.error('Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ 
        message: 'Erro ao atualizar usuário',
        error: updateError.message 
      });
    }
  } catch (error) {
    await t.rollback();
    console.error('=================================');
    console.error('=== ERRO NA ATUALIZAÇÃO DE PERFIL ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('=================================');
    
    // Garante que sempre retorne JSON
    return res.status(500).json({ 
      message: 'Erro ao atualizar usuário',
      error: error.message 
    });
  }
});

// Rota para solicitar mudança de email
router.post('/change-email/request', authenticate, async (req, res) => {
  try {
    const { current_email, new_email } = req.body;
    const user = req.user;

    console.log('=================================');
    console.log('=== SOLICITAÇÃO DE MUDANÇA DE EMAIL ===');
    console.log('Data/Hora:', new Date().toISOString());
    console.log('ID do Usuário:', user.id);
    console.log('Nome do Usuário:', user.name);
    console.log('Email Atual:', current_email);
    console.log('Novo Email:', new_email);
    console.log('=================================');

    // Verifica se o email atual está correto
    if (user.email !== current_email) {
      console.log('ERRO: Email atual incorreto');
      console.log('Email do usuário:', user.email);
      console.log('Email fornecido:', current_email);
      return res.status(400).json({ message: 'Email atual incorreto' });
    }

    // Verifica se o novo email já está em uso
    const existingUser = await User.findOne({ where: { email: new_email } });
    if (existingUser) {
      console.log('ERRO: Email já em uso');
      console.log('Email:', new_email);
      console.log('ID do usuário que já usa:', existingUser.id);
      return res.status(400).json({ message: 'Este email já está em uso' });
    }

    // Gera um código de verificação
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Código expira em 30 minutos

    console.log('=================================');
    console.log('=== CÓDIGO DE VERIFICAÇÃO GERADO ===');
    console.log('Código:', code);
    console.log('Expira em:', expiresAt.toISOString());
    console.log('=================================');

    // Salva o código de verificação
    const savedCode = await VerificationCode.create({
      email: new_email,
      code,
      expires_at: expiresAt,
      user_data: JSON.stringify({
        current_email,
        new_email
      })
    });

    console.log('=================================');
    console.log('=== CÓDIGO SALVO NO BANCO ===');
    console.log('ID do código:', savedCode.id);
    console.log('Email:', savedCode.email);
    console.log('Data de expiração:', savedCode.expires_at);
    console.log('=================================');

    // Envia o email com o código
    await sendVerificationEmail(new_email, code);
    
    console.log('=================================');
    console.log('=== EMAIL ENVIADO COM SUCESSO ===');
    console.log('Para:', new_email);
    console.log('Nome:', user.name);
    console.log('=================================');

    res.json({ message: 'Código de verificação enviado para o novo email' });
  } catch (error) {
    console.error('=================================');
    console.error('=== ERRO NA MUDANÇA DE EMAIL ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('=================================');
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Rota para verificar o código e mudar o email
router.post('/change-email/verify', authenticate, async (req, res) => {
  try {
    const { new_email, code } = req.body;
    const user = req.user;

    console.log('=================================');
    console.log('=== VERIFICAÇÃO DE CÓDIGO DE EMAIL ===');
    console.log('Data/Hora:', new Date().toISOString());
    console.log('ID do Usuário:', user.id);
    console.log('Nome do Usuário:', user.name);
    console.log('Email Atual:', user.email);
    console.log('Novo Email:', new_email);
    console.log('Código Recebido:', code);
    console.log('=================================');

    // Busca o código de verificação
    const verificationCode = await VerificationCode.findOne({
      where: {
        email: new_email,
        code,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!verificationCode) {
      console.log('=================================');
      console.log('=== ERRO: CÓDIGO INVÁLIDO OU EXPIRADO ===');
      console.log('Email:', new_email);
      console.log('Código:', code);
      console.log('Data Atual:', new Date().toISOString());
      console.log('=================================');
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    console.log('=================================');
    console.log('=== CÓDIGO VÁLIDO ENCONTRADO ===');
    console.log('ID do código:', verificationCode.id);
    console.log('Email:', verificationCode.email);
    console.log('Data de expiração:', verificationCode.expires_at);
    console.log('=================================');

    // Atualiza o email do usuário
    const oldEmail = user.email;
    await user.update({ email: new_email });
    
    console.log('=================================');
    console.log('=== EMAIL DO USUÁRIO ATUALIZADO ===');
    console.log('Email Antigo:', oldEmail);
    console.log('Novo Email:', new_email);
    console.log('=================================');

    // Remove o código de verificação
    await verificationCode.destroy();
    
    console.log('=================================');
    console.log('=== CÓDIGO DE VERIFICAÇÃO REMOVIDO ===');
    console.log('ID do código removido:', verificationCode.id);
    console.log('=================================');

    res.json({
      message: 'Email atualizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        telegram_verified: user.telegram_verified,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_start_date: user.financial_goal_start_date,
        financial_goal_end_date: user.financial_goal_end_date
      }
    });
  } catch (error) {
    console.error('=================================');
    console.error('=== ERRO NA VERIFICAÇÃO DE CÓDIGO ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('=================================');
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Rota de login
router.post('/login', async (req, res) => {
  console.log('===========================================');
  console.log('INICIANDO /${process.env.API_PREFIX}/auth/login');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Body parcial:', JSON.stringify({ ...req.body, email: req.body.email ? `${req.body.email.slice(0, 3)}...` : undefined }));
  
  const t = await sequelize.transaction();
  
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      await t.rollback();
      return res.status(400).json({ message: 'Email e código são obrigatórios' });
    }
    
    // Buscar código válido mais recente
    const verificationCode = await VerificationCode.findOne({
      where: {
        email: email.toLowerCase(),
        code: code,
        expires_at: { [Op.gt]: new Date() }, // ainda não expirou
        used: false
      },
      order: [['created_at', 'DESC']],
      transaction: t
    });
    
    if (!verificationCode) {
      await t.rollback();
      return res.status(401).json({ message: 'Código inválido ou expirado' });
    }
    
    // Marcar código como usado
    verificationCode.used = true;
    await verificationCode.save({ transaction: t });
    
    // Buscar ou criar usuário
    let user = await User.findOne({ 
      where: { email: email.toLowerCase() },
      transaction: t
    });
    
    if (!user) {
      console.log(`User ${email} não encontrado. Isso não deveria acontecer neste ponto.`);
      await t.rollback();
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o usuário tem uma assinatura ativa
    const activeSubscription = await Payment.findOne({
      where: {
        user_id: user.id,
        payment_status: 'approved',
        subscription_expiration: {
          [Op.gt]: new Date() // Assinatura ainda não expirou
        }
      },
      transaction: t
    });

    const hasActiveSubscription = !!activeSubscription;
    
    // Gerar token JWT
    const token = generateJWT(user.id, user.email);
    
    await t.commit();
    
    // Enviar resposta com token
    res.json({ 
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      hasActiveSubscription
    });
    
  } catch (error) {
    await t.rollback();
    console.error('Erro detalhado no login:', error);
    res.status(500).json({ message: 'Erro ao realizar login' });
  } finally {
    console.log('FINALIZANDO /${process.env.API_PREFIX}/auth/login');
  }
});

// Rota para verificar se o token é válido
router.get('/verify-token', authenticate, (req, res) => {
  res.status(200).json({
    valid: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
  });
});

// Nova rota para verificar token sem precisar de autenticação prévia (via POST)
router.post('/check-token', async (req, res) => {
  try {
    console.log('=== VERIFICAÇÃO DE TOKEN SEM AUTENTICAÇÃO PRÉVIA ===');
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Token não fornecido' 
      });
    }
    
    try {
      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        return res.status(401).json({ 
          valid: false, 
          message: 'Token inválido: identificação do usuário ausente' 
        });
      }
      
      // Buscar o usuário
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false, 
          message: 'Usuário não encontrado' 
        });
      }
      
      // Verificar se tem assinatura ativa
      const activeSubscription = await Payment.findOne({
        where: {
          user_id: user.id,
          payment_status: 'approved',
          subscription_expiration: {
            [Op.gt]: new Date()
          }
        }
      });
      
      // Token é válido e usuário existe
      return res.status(200).json({
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telegram_verified: user.telegram_verified
        },
        hasActiveSubscription: !!activeSubscription
      });
    } catch (error) {
      console.error('Erro ao verificar token:', error.message);
      
      // Retornar informações úteis sobre o erro
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          valid: false, 
          message: 'Token expirado', 
          expired: true 
        });
      }
      
      return res.status(401).json({ 
        valid: false, 
        message: 'Token inválido' 
      });
    }
  } catch (error) {
    console.error('Erro ao processar verificação de token:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Erro interno ao verificar token' 
    });
  }
});

// Nova rota para verificar token sem precisar de autenticação prévia (via GET)
router.get('/check-token', async (req, res) => {
  try {
    console.log('=== VERIFICAÇÃO DE TOKEN VIA GET ===');
    // Extrair o token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    console.log('Authorization Header:', authHeader ? `${authHeader.substring(0, 15)}...` : 'Não fornecido');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Token não fornecido ou formato inválido' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;
      
      if (!userId) {
        return res.status(401).json({ 
          valid: false, 
          message: 'Token inválido: identificação do usuário ausente' 
        });
      }
      
      // Buscar o usuário
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false, 
          message: 'Usuário não encontrado' 
        });
      }
      
      // Verificar se tem assinatura ativa
      const activeSubscription = await Payment.findOne({
        where: {
          user_id: user.id,
          payment_status: 'approved',
          subscription_expiration: {
            [Op.gt]: new Date()
          }
        }
      });
      
      // Token é válido e usuário existe
      return res.status(200).json({
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          telegram_verified: user.telegram_verified
        },
        hasActiveSubscription: !!activeSubscription
      });
    } catch (error) {
      console.error('Erro ao verificar token:', error.message);
      
      // Retornar informações úteis sobre o erro
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          valid: false, 
          message: 'Token expirado', 
          expired: true 
        });
      }
      
      return res.status(401).json({ 
        valid: false, 
        message: 'Token inválido' 
      });
    }
  } catch (error) {
    console.error('Erro ao processar verificação de token:', error);
    return res.status(500).json({ 
      valid: false, 
      message: 'Erro interno ao verificar token' 
    });
  }
});

export default router;