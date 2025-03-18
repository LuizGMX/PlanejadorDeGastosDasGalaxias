import { Router } from 'express';
import { User, Bank, VerificationCode } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = Router();

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

// Rota para atualizar o perfil do usuário
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, net_income, financial_goal_name, financial_goal_amount, financial_goal_date } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Se houver mudança no net_income, salva o valor antigo
    if (net_income && net_income !== user.net_income) {
      await user.update({
        old_net_income: user.net_income,
        old_net_income_date: new Date()
      });
    }

    // Atualiza os demais dados
    await user.update({
      name: name || user.name,
      net_income: net_income || user.net_income,
      financial_goal_name: financial_goal_name || user.financial_goal_name,
      financial_goal_amount: financial_goal_amount || user.financial_goal_amount,
      financial_goal_date: financial_goal_date || user.financial_goal_date,
    });

    // Busca o usuário atualizado
    const updatedUser = await User.findByPk(req.user.id);

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      net_income: updatedUser.net_income,
      old_net_income: updatedUser.old_net_income,
      old_net_income_date: updatedUser.old_net_income_date,
      financial_goal_name: updatedUser.financial_goal_name,
      financial_goal_amount: updatedUser.financial_goal_amount,
      financial_goal_date: updatedUser.financial_goal_date
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

// Rota para iniciar processo de mudança de email
router.post('/change-email/request', authenticate, async (req, res) => {
  try {
    const { current_email, new_email } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (user.email !== current_email) {
      return res.status(400).json({ message: 'Email atual incorreto' });
    }

    if (!/^\S+@\S+\.\S+$/.test(new_email)) {
      return res.status(400).json({ message: 'Novo email inválido' });
    }

    // Verifica se o novo email já está em uso
    const existingUser = await User.findOne({ where: { email: new_email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso' });
    }

    // Gera e salva o código de verificação
    const code = generateVerificationCode();
    await VerificationCode.destroy({ where: { email: new_email } });
    await VerificationCode.create({
      email: new_email,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Envia o código para o novo email
    await sendVerificationEmail(new_email, user.name, code);

    res.json({ message: 'Código de verificação enviado para o novo email' });
  } catch (error) {
    console.error('Erro ao iniciar mudança de email:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
});

// Rota para verificar código e completar mudança de email
router.post('/change-email/verify', authenticate, async (req, res) => {
  try {
    const { new_email, code } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verifica o código
    const verification = await VerificationCode.findOne({
      where: {
        email: new_email,
        code
      }
    });

    if (!verification || Date.now() > verification.expires_at) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    // Atualiza o email do usuário
    await user.update({ email: new_email });
    await VerificationCode.destroy({ where: { email: new_email } });

    res.json({
      message: 'Email atualizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        net_income: user.net_income,
        old_net_income: user.old_net_income,
        old_net_income_date: user.old_net_income_date,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_date: user.financial_goal_date
      }
    });
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    res.status(500).json({ message: 'Erro ao verificar código' });
  }
});

// router.get('/banks', authenticate, async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id, {
//       include: [{ model: Bank }]
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'Usuário não encontrado' });
//     }

//     res.json(user.Banks);
//   } catch (error) {
//     console.error('Erro ao buscar bancos do usuário:', error);
//     res.status(500).json({ message: 'Erro ao buscar bancos do usuário' });
//   }
// });

export default router; 