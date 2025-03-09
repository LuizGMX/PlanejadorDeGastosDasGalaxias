import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { User, VerificationCode } from '../models/index.js';

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

const sendVerificationEmail = async (email, name, code) => {
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
    console.error(`Erro ao enviar email para ${email}:`, error);
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

// Validação de entrada
const validateSendCodeInput = ({ email, netIncome, selectedBanks }) => {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return 'E-mail inválido';
  if (!netIncome || isNaN(netIncome)) return 'Renda líquida inválida';
  if (!selectedBanks || !Array.isArray(selectedBanks) || selectedBanks.length === 0) {
    return 'Bancos selecionados inválidos';
  }
  return null;
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
    const { email, name, netIncome, selectedBanks } = req.body;
    // Validação básica do email
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    // Verifica se o usuário já existe
    let user = await User.findOne({ where: { email } });
    const isNewUser = !user;

    if (isNewUser) {
      // Para novos usuários, valida netIncome e selectedBanks
      if (!netIncome || isNaN(netIncome)) {
        return res.status(400).json({ message: 'Renda líquida inválida' });
      }
      if (!selectedBanks || !Array.isArray(selectedBanks) || selectedBanks.length === 0) {
        return res.status(400).json({ message: 'Bancos selecionados inválidos' });
      }
      // Cria o novo usuário
      user = await User.create({ email, name: name || '', net_income: netIncome });
    } else {
      // Para usuários existentes, atualiza o nome se fornecido
      if (name) {
        await user.update({ name });
      }
    }

    // Gera o código de verificação
    const code = generateVerificationCode();
    await VerificationCode.destroy({ where: { email } });
    await VerificationCode.create({ 
      email, 
      code, 
      expires_at: new Date(Date.now() + 10 * 60 * 1000) 
    });
    
    // Apenas mostra o código no console ao invés de enviar por email
    console.log('=================================');
    console.log(`Código de verificação para ${email}: ${code}`);
    console.log('=================================');
    
    return res.json({ message: 'Código gerado com sucesso! Verifique o console do backend.' });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    return res.status(500).json({ message: 'Erro interno ao gerar código' });
  }
});

router.post('/verify-code', async (req, res) => {
  console.log('/api/auth/verify-code chamado');
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'E-mail e código são obrigatórios' });
    }

    const verification = await VerificationCode.findOne({ where: { email, code } });
    if (!verification || Date.now() > verification.expires_at) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    const user = await User.findOne({ where: { email } });
    const token = generateJWT(user.id, user.email);

    await VerificationCode.destroy({ where: { email } });
    return res.json({ token });
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ message: 'Erro interno ao verificar o código' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  console.log('/api/auth/me chamado');
  return res.json({ name: req.user.name, avatar: req.user.avatar });
});

router.put('/me', authenticate, async (req, res) => {
  console.log('/api/auth/me chamado');
  try {
    await req.user.update(req.body);
    return res.json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

export default router;