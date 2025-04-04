import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { User, VerificationCode, UserBank, Bank } from '../models/index.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';

dotenv.config();

// Configurar SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

const sendVerificationEmail = async (email, name, code) => {
  console.log('Enviando email para:', email);
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Código de Verificação - Planejador Das Galáxias',
    text: `Seu código de verificação é: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Código de Verificação</h2>
        <p>Olá ${name || 'Usuário'},</p>
        <p>Seu código de verificação é:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
          ${code}
        </div>
        <p>Este código expira em 10 minutos.</p>
        <p>Se você não solicitou este código, ignore este email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email enviado com sucesso para: ${email}`);
  } catch (error) {
    console.error('Erro detalhado ao enviar email:', error.response?.body);
    throw new Error('Falha ao enviar email de verificação');
  }
};

// Middleware de autenticação
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro detalhado na autenticação:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
};

// Rotas
router.post('/check-email', async (req, res) => {
  console.log('/api/auth/check-email chamado');
  try {
    const { email } = req.body;
    console.log('Email recebido:', email);
    
    if (!email) {
      return res.status(400).json({ message: 'E-mail é obrigatório' });
    }
    
    // Verifica se o email é válido
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }
    
    const user = await User.findOne({ 
      where: { email },
      attributes: ['id', 'name', 'email']
    });
    
    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
    
    // Se o usuário existir, gera e envia o código imediatamente
    if (user) {
      const code = generateVerificationCode();
      console.log('Código gerado para usuário existente:', code);

      // Remove códigos antigos
      await VerificationCode.destroy({ where: { email } });
      
      // Salva o novo código
      await VerificationCode.create({
        email,
        code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000)
      });

      // Envia o email
      try {
        await sendVerificationEmail(email, user.name, code);
        console.log('Email enviado com sucesso para usuário existente');
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      return res.json({
        isNewUser: false,
        name: user.name,
        email: user.email,
        message: 'Código enviado com sucesso!'
      });
    }
    
    // Se não existir, retorna que é um novo usuário
    return res.json({
      isNewUser: true,
      name: null,
      email: null
    });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    return res.status(500).json({ message: 'Erro interno ao verificar email' });
  }
});

router.post('/send-code', async (req, res) => {
  console.log('/api/auth/send-code chamado');
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
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    // Se for novo usuário, valida os dados necessários
    if (isNewUser && (!name || !financialGoalName || !financialGoalAmount || !financialGoalPeriodType || !financialGoalPeriodValue)) {
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

    // Envia o email
    try {
      await sendVerificationEmail(email, name, code);
      console.log('Email enviado com sucesso');
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      throw new Error('Falha ao enviar email de verificação');
    }

    return res.json({ message: 'Código enviado com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar código:', error);
    return res.status(500).json({ message: error.message || 'Erro interno ao enviar código' });
  }
});

router.post('/verify-code', async (req, res) => {
  const t = await sequelize.transaction();
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
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    // Busca o usuário
    let user = await User.findOne({ where: { email } });
    
    if (isNewUser) {
      // Se for um novo usuário, valida os dados necessários
      if (!name || !financialGoalName || !financialGoalAmount || !financialGoalPeriodType || !financialGoalPeriodValue) {
        await t.rollback();
        return res.status(400).json({ message: 'Todos os dados são obrigatórios para novos usuários' });
      }

      // Calcula as datas do objetivo
      const startDate = new Date();
      let endDate = new Date(startDate);

      if (financialGoalPeriodType && financialGoalPeriodValue) {
        switch (financialGoalPeriodType) {
          case 'days':
            endDate.setDate(startDate.getDate() + parseInt(financialGoalPeriodValue));
            break;
          case 'months':
            endDate.setMonth(startDate.getMonth() + parseInt(financialGoalPeriodValue));
            break;
          case 'years':
            endDate.setFullYear(startDate.getFullYear() + parseInt(financialGoalPeriodValue));
            break;
        }
      }

      // Cria um novo usuário
      user = await User.create({
        email,
        name: name,
        financial_goal_name: financialGoalName,
        financial_goal_amount: financialGoalAmount ? parseFloat(financialGoalAmount.toString().replace(/\./g, '').replace(',', '.')) : null,
        financial_goal_start_date: startDate,
        financial_goal_end_date: endDate
      }, { transaction: t });
    } else {
      // Se for um usuário existente, apenas verifica se existe
      if (!user) {
        await t.rollback();
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
    }

    // Associar bancos ao usuário, se houver
    if (selectedBanks && selectedBanks.length > 0) {
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
      } catch (error) {
        console.error('Erro ao associar bancos:', error);
        throw error; // Re-throw para que a transação seja revertida
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

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_start_date: user.financial_goal_start_date,
        financial_goal_end_date: user.financial_goal_end_date,
        telegram_verified: user.telegram_verified
      },
      redirectTo: isNewUser ? '/telegram' : '/dashboard'
    });
  } catch (error) {
    await t.rollback();
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ message: 'Erro ao verificar código' });
  }
});

router.post('/send-access-code', async (req, res) => {
  console.log('/api/auth/send-access-code chamado');
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
    await sendVerificationEmail(email, user.name, code);

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
  console.log('/api/auth/me chamado');
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
            console.log('Erro: Tipo de período inválido');
            return res.status(400).json({ message: 'Tipo de período inválido' });
        }
      } catch (dateError) {
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
          console.log('Erro: Valor do objetivo inválido');
          return res.status(400).json({ message: 'Valor do objetivo inválido' });
        }
      } catch (amountError) {
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
      });

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
      console.error('Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ 
        message: 'Erro ao atualizar usuário',
        error: updateError.message 
      });
    }
  } catch (error) {
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
    await sendVerificationEmail(new_email, user.name, code);
    
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

export default router;