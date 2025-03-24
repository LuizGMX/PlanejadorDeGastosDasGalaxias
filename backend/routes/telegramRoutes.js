import express from 'express';
import { User } from '../models/index.js';
import telegramService from '../services/telegramService.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Rota para iniciar verificação do Telegram
router.post('/init-verification', authenticate, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;

    // Atualiza o número de telefone do usuário
    await User.update(
      { phoneNumber },
      { where: { id: userId } }
    );

    // Gera código de verificação
    const verificationCode = telegramService.generateVerificationCode();
    
    // Busca o email do usuário
    const user = await User.findByPk(userId);
    
    // Armazena o código para validação posterior
    telegramService.verificationCodes.set(verificationCode, {
      telegramUsername: null, // será preenchido quando o usuário usar o bot
      userId,
      timestamp: Date.now()
    });

    // Envia o código por email
    await sendVerificationEmail(user.email, verificationCode);

    // Retorna sucesso
    res.json({
      success: true,
      message: 'Número atualizado e código de verificação enviado com sucesso',
      botUsername: process.env.TELEGRAM_BOT_USERNAME
    });

  } catch (error) {
    console.error('Erro ao iniciar verificação do Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar verificação do Telegram'
    });
  }
});

export default router; 