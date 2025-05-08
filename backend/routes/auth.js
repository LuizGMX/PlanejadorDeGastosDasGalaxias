import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { models } from '../models/index.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { generateVerificationCode } from '../utils/verificationCode.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';

const router = express.Router();
const { User, VerificationCode, UserBank, Bank, Payment, FinancialGoal } = models;

// Utility Functions
const generateJWT = (userId, email) => {
  const secret = process.env.JWT_SECRET || 'default-secret-key';
  return jwt.sign(
    { userId, email },
    secret,
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
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'E-mail é obrigatório' });
  }
  
  // Verifica se o email é válido
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'E-mail inválido' });
  }
  
  try {
    // Primeiro responde rapidamente para evitar timeout
    res.json({
      isNewUser: true,
      message: 'Verificação em andamento. Por favor, continue.'
    });
    
    // Depois faz a consulta ao banco de dados e envia email (após já ter respondido)
    setTimeout(async () => {
      try {
        const user = await User.findOne({ 
          where: { email },
          attributes: ['id', 'name', 'email'],
          timeout: 5000
        });
        
        if (user) {
          const code = generateVerificationCode();
          
          try {
            await VerificationCode.destroy({ where: { email } });
            await VerificationCode.create({
              email,
              code,
              expires_at: new Date(Date.now() + 10 * 60 * 1000)
            });
            
            // Enviar email assincronamente
            sendVerificationEmail(email, code).catch(e => 
              console.error('Erro ao enviar email:', e)
            );
          } catch (dbErr) {
            console.error('Erro ao processar código para o usuário:', dbErr);
          }
        }
      } catch (err) {
        console.error('Erro ao processar verificação de email:', err);
      }
    }, 100);
  } catch (error) {
    // Se já enviei resposta, não preciso responder novamente
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao verificar email' });
    }
  }
});

router.post('/send-code', async (req, res) => {
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

  // Validação básica do email
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'E-mail inválido' });
  }

  // Se for novo usuário, valida os dados necessários
  if (isNewUser && (!name || !financialGoalName || !financialGoalAmount || !financialGoalPeriodType || !financialGoalPeriodValue)) {
    return res.status(400).json({ message: 'Todos os dados são obrigatórios para novos usuários' });
  }

  try {
    // Primeiro responde rapidamente
    res.json({ message: 'Código sendo enviado. Por favor, aguarde.' });
    
    // Depois processa assincronamente
    setTimeout(async () => {
      try {
        // Gera o código de verificação
        const code = generateVerificationCode();
        
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
        
        // Envia o email
        await sendVerificationEmail(email, code);
      } catch (err) {
        console.error('Erro ao processar envio de código:', err);
      }
    }, 100);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao enviar código' });
    }
  }
});

router.post('/verify-code', async (req, res) => {
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

    // Resposta rápida para evitar timeout na UI
    res.json({ 
      message: 'Verificação em processamento', 
      status: 'verifying',
      email: email
    });

    // Processamento em background, após a resposta
    setTimeout(async () => {
      const t = await sequelize.transaction();
      try {
        // Validação do código de verificação
        const verificationCode = await VerificationCode.findOne({
          where: {
            email,
            code,
            expires_at: { [Op.gt]: new Date() }
          }
        });

        if (!verificationCode) {
          await t.rollback();
          return; // Código inválido, mas já respondemos ao cliente
        }

        // Busca o usuário
        let user = await User.findOne({ where: { email } });

        // Se for um novo usuário, cria o usuário
        if (isNewUser && !user) {
          user = await User.create({
            email,
            name,
            desired_budget: financialGoalAmount || 0
          }, { transaction: t });

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
            
            await FinancialGoal.create({
              user_id: user.id,
              name: financialGoalName,
              amount: financialGoalAmount,
              period_type: financialGoalPeriodType || 'years',
              period_value: financialGoalPeriodValue || 1,
              start_date: startDate,
              end_date: endDate
            }, { transaction: t });
          }

          // Criar registro de pagamento inicial com 7 dias gratuitos
          const trialExpirationDate = new Date();
          trialExpirationDate.setDate(trialExpirationDate.getDate() + 7); // 7 dias de teste
          
          await Payment.create({
            user_id: user.id,
            subscription_expiration: trialExpirationDate,
            payment_status: 'approved',
            payment_method: 'trial',
            payment_amount: 0,
            payment_date: new Date()
          }, { transaction: t });
        }

        // Associar bancos ao usuário, se houver
        if (selectedBanks && selectedBanks.length > 0) {
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
              }, { transaction: t });
            }
          } catch (error) {
            console.error('Erro ao associar bancos:', error);
            await t.rollback();
            return;
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
      } catch (error) {
        await t.rollback();
        console.error('Erro ao verificar código:', error);
      }
    }, 100);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Erro ao verificar código' });
    }
  }
});

router.post('/send-access-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    // Resposta rápida
    res.json({ message: 'Solicitação recebida, processando envio de código.' });

    // Processamento em background
    setTimeout(async () => {
      try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
          return; // Já respondemos ao cliente
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
      } catch (error) {
        console.error('Erro ao processar envio de código de acesso:', error);
      }
    }, 100);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro interno ao enviar código de acesso' });
    }
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

// Rota otimizada para login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    // Resposta rápida para evitar timeout
    res.json({
      message: 'Autenticando. Por favor, aguarde...',
      status: 'authenticating'
    });

    // Processamento em background
    setTimeout(async () => {
      try {
        const user = await User.findOne({ 
          where: { email },
          attributes: ['id', 'name', 'email', 'password'],
          raw: true
        });
    
        if (!user) {
          return; // Usuário não encontrado, mas já respondemos
        }
    
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return; // Senha inválida, mas já respondemos
        }
    
        const token = generateJWT(user.id, user.email);
      } catch (error) {
        console.error('Erro ao processar login:', error);
      }
    }, 100);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Erro ao realizar login' });
    }
  }
});

export default router;