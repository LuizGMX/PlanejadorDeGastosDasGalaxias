import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { User, VerificationCode } from '../models/index.js';

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
const authenticate = async (req, res, next) => {
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
      netIncome,       
      financialGoalName,
      financialGoalAmount,
      financialGoalDate
    } = req.body;

    console.log('Dados recebidos:', { email, name, netIncome, financialGoalName, financialGoalAmount, financialGoalDate });

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
      userData: JSON.stringify({
        name,
        netIncome,
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
  console.log('/api/auth/verify-code chamado');
  try {
    const { email, code, name, netIncome, financialGoalName, financialGoalAmount, financialGoalDate } = req.body;
    console.log('Dados recebidos:', { email, code, name, netIncome, financialGoalName, financialGoalAmount, financialGoalDate });

    if (!email || !code) {
      return res.status(400).json({ message: 'E-mail e código são obrigatórios' });
    }

    const verification = await VerificationCode.findOne({ where: { email, code } });
    if (!verification || Date.now() > verification.expires_at) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    let user = await User.findOne({ where: { email } });
    let userData = {
      name,
      netIncome,
      financialGoalName,
      financialGoalAmount,
      financialGoalDate
    };
    
    console.log('Dados do usuário antes do merge:', userData);
    
    if (verification.userData) {
      try {
        const storedUserData = JSON.parse(verification.userData);
        console.log('Dados armazenados:', storedUserData);
        // Combina os dados armazenados com os dados recebidos
        userData = {
          ...storedUserData,
          ...userData
        };
        console.log('Dados combinados:', userData);
      } catch (e) {
        console.error('Erro ao parsear userData:', e);
      }
    }
    
    // Se não existir usuário, cria um novo
    if (!user) {
      console.log('Criando novo usuário com dados:', userData);
      if (!userData.name) {
        return res.status(400).json({ message: 'Nome é obrigatório para novos usuários' });
      }

      user = await User.create({ 
        email, 
        name: userData.name, 
        net_income: userData.netIncome || 0,
        is_active: true,
        financial_goal_name: userData.financialGoalName || null,
        financial_goal_amount: userData.financialGoalAmount || null,
        financial_goal_date: userData.financialGoalDate || null
      });
      console.log('Novo usuário criado:', user.toJSON());
    } else if (userData && Object.keys(userData).length > 0) {
      console.log('Atualizando usuário existente com dados:', userData);
      // Atualiza dados do usuário existente se necessário
      const updateData = {};
      
      if (userData.name) updateData.name = userData.name;
      if (userData.netIncome) updateData.net_income = userData.netIncome;
      if (userData.financialGoalName) updateData.financial_goal_name = userData.financialGoalName;
      if (userData.financialGoalAmount) updateData.financial_goal_amount = userData.financialGoalAmount;
      if (userData.financialGoalDate) updateData.financial_goal_date = userData.financialGoalDate;
      
      if (Object.keys(updateData).length > 0) {
        await user.update(updateData);
        console.log('Usuário atualizado:', user.toJSON());
      }
    }

    const token = generateJWT(user.id, user.email);

    await VerificationCode.destroy({ where: { email } });
    return res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        net_income: user.net_income,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_date: user.financial_goal_date
      }
    });
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ message: 'Erro interno ao verificar o código' });
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
  return res.json({ name: req.user.name, 
    email: req.user.email,
    net_income: req.user.net_income,
    financial_goal_name: req.user.financial_goal_name,
    financial_goal_amount: parseInt(req.user.financial_goal_amount),
    financial_goal_date: req.user.financial_goal_date
   });
});

router.put('/me', authenticate, async (req, res) => {
  console.log('/api/auth/me chamado');
  try {
    const {
      name,
      email,
      net_income,
      financial_goal_name,
      financial_goal_amount,
      financial_goal_date,
      old_net_income,
    } = req.body;

    await req.user.update({
      name,
      email,
      net_income,
      financial_goal_name,
      financial_goal_amount: parseInt(financial_goal_amount),
      financial_goal_date,
      old_net_income
    });

    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      net_income: req.user.net_income,
      financial_goal_name: req.user.financial_goal_name,
      financial_goal_amount: parseInt(req.user.financial_goal_amount),
      financial_goal_date: req.user.financial_goal_date,
      old_net_income: req.user.old_net_income
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
});

export default router;