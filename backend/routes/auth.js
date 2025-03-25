import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { User, VerificationCode, UserBank } from '../models/index.js';
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
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    console.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
};

// Rotas
router.post('/check-email', async (req, res) => {
  console.log('/api/auth/check-email chamado');
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'E-mail é obrigatório' });
    }
    const user = await User.findOne({ where: { email } });
    return res.json({
      isNewUser: !user,
      name: user ? user.name : null,
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
      financialGoalDate
    } = req.body;

    console.log('Dados recebidos:', { email, name, financialGoalName, financialGoalAmount, financialGoalDate });

    // Validação básica do email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    // Verifica se o usuário já existe
    let user = await User.findOne({ where: { email } });
    const isNewUser = !user;

    console.log('Status do usuário:', isNewUser ? 'Novo usuário' : 'Usuário existente');

    // Se for novo usuário, valida o nome
    if (isNewUser && !name) {
      return res.status(400).json({ message: 'Nome é obrigatório para novos usuários' });
    }

    // Gera o código de verificação
    const code = generateVerificationCode();
    console.log('Código gerado:', code);

    // Remove códigos antigos
    await VerificationCode.destroy({ where: { email } });
    
    // Armazena os dados do usuário temporariamente junto com o código
    const verificationData = {
      email, 
      code,
      user_data: JSON.stringify({
        name,
        financialGoalName,
        financialGoalAmount,
        financialGoalDate
      }),
      expires_at: new Date(Date.now() + 10 * 60 * 1000)
    };

    console.log('Dados de verificação:', verificationData);

    await VerificationCode.create(verificationData);

    // Tenta enviar o email
    try {
      await sendVerificationEmail(email, name || (user ? user.name : null), code);
      console.log('Email enviado com sucesso');
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      // Mesmo se o email falhar, mostramos o código no console
    }
    
    // Sempre mostra o código no console para desenvolvimento
    console.log('=================================');
    console.log(`Código de verificação para ${email}: ${code}`);
    console.log('=================================');
    
    return res.json({ 
      message: 'Código gerado com sucesso! Verifique seu email ou o console do backend.',
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    return res.status(500).json({ message: 'Erro interno ao gerar código' });
  }
});

router.post('/verify-code', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
      email, 
      code, 
      name, 
      desired_budget,
      financialGoalName, 
      financialGoalAmount, 
      financialGoalDate, 
      selectedBanks,
      phone_number
    } = req.body;

    console.log('Dados recebidos em verify-code:', {
      email,
      code,
      name,
      desired_budget,
      financialGoalName,
      financialGoalAmount,
      financialGoalDate
    });

    // Busca o código de verificação
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

    // Converte os valores monetários para números
    const parsedDesiredBudget = desired_budget ? parseFloat(desired_budget.toString().replace(/\./g, '').replace(',', '.')) : 0;
    const parsedFinancialGoalAmount = financialGoalAmount ? parseFloat(financialGoalAmount.toString().replace(/\./g, '').replace(',', '.')) : 0;

    console.log('Valores convertidos:', {
      parsedDesiredBudget,
      parsedFinancialGoalAmount
    });

    // Busca ou cria o usuário
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      user = await User.create({
        email,
        name,
        desired_budget: parsedDesiredBudget,
        financial_goal_name: financialGoalName,
        financial_goal_amount: parsedFinancialGoalAmount,
        financial_goal_date: financialGoalDate,
        phone_number
      }, { transaction: t });
    } else {
      await user.update({
        desired_budget: parsedDesiredBudget,
        financial_goal_name: financialGoalName,
        financial_goal_amount: parsedFinancialGoalAmount,
        financial_goal_date: financialGoalDate,
        phone_number
      }, { transaction: t });
    }

    // Associa os bancos selecionados ao usuário
    if (selectedBanks && selectedBanks.length > 0) {
      await UserBank.destroy({ where: { user_id: user.id }, transaction: t });
      await Promise.all(
        selectedBanks.map(bankId =>
          UserBank.create({
            user_id: user.id,
            bank_id: bankId
          }, { transaction: t })
        )
      );
    }

    await t.commit();

    // Gera o token JWT
    const token = generateJWT(user.id, user.email);

    return res.json({
      message: 'Usuário verificado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        desired_budget: user.desired_budget,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_date: user.financial_goal_date,
        telegram_verified: user.telegram_verified
      }
    });
  } catch (error) {
    await t.rollback();
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ message: 'Erro interno ao verificar código' });
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
      phone_number: user.phone_number,
      telegram_verified: user.telegram_verified,
      financial_goal_name: user.financial_goal_name,
      financial_goal_amount: parseInt(user.financial_goal_amount),
      financial_goal_date: user.financial_goal_date,
      desired_budget: user.desired_budget
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  console.log('/api/auth/me chamado');
  try {
    const {
      name,
      email,
      phone_number,
      financial_goal_name,
      financial_goal_amount,
      financial_goal_date,
    } = req.body;

    // Valida o formato do número do Telegram se fornecido
    if (phone_number && !/^\+?[1-9]\d{10,14}$/.test(phone_number)) {
      return res.status(400).json({ 
        message: 'Formato inválido do número do Telegram. Use o formato internacional (ex: +5511999999999)' 
      });
    }

    await req.user.update({
      name,
      email,
      phone_number,
      telegram_verified: phone_number ? false : req.user.telegram_verified, // Reseta a verificação se mudar o número
      financial_goal_name,
      financial_goal_amount: parseInt(financial_goal_amount),
      financial_goal_date,
    });

    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone_number: req.user.phone_number,
      telegram_verified: req.user.telegram_verified,
      financial_goal_name: req.user.financial_goal_name,
      financial_goal_amount: parseInt(req.user.financial_goal_amount),
      financial_goal_date: req.user.financial_goal_date,
      message: phone_number ? 
        'Seu número do Telegram foi atualizado! Em breve você receberá um código de verificação para ativar as funcionalidades do Telegram.' :
        'Seu número do Telegram foi removido. Você pode configurá-lo novamente quando quiser!'
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

export default router;