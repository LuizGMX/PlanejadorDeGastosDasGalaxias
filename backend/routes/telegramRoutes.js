import { Router } from 'express';
import { User, VerificationCode } from '../models/index.js';
import { telegramService } from '../services/telegramService.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { authenticate } from './auth.js';
import { Op } from 'sequelize';

const router = Router();

// Função para gerar código de verificação
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Rota para iniciar verificação do Telegram
router.post('/init-verification', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Iniciando verificação para usuário:', userId);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verifica se já existe um código válido
    const existingCode = await VerificationCode.findOne({
      where: {
        email: user.email,
        expires_at: {
          [Op.gt]: new Date()
        },
        used: false
      }
    });

    if (existingCode) {
      return res.json({
        success: true,
        message: 'Código existente ainda válido',
        code: existingCode.code,
        expiresAt: existingCode.expires_at
      });
    }

    // Remove códigos antigos
    await VerificationCode.destroy({
      where: {
        email: user.email
      }
    });

    // Gera novo código
    const code = generateVerificationCode();
    console.log('Novo código gerado:', code);

    // Salva o código
    await VerificationCode.create({
      email: user.email,
      code: code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
      used: false
    });

    res.json({
      success: true,
      message: 'Código gerado com sucesso! Use-o no Telegram.',
      code: code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar código de verificação'
    });
  }
});

// Rota para desconectar o Telegram
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Desconectando Telegram para usuário:', userId);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Limpa os dados do Telegram do usuário
    await user.update({
      telegram_chat_id: null,
      telegram_username: null,
      telegram_verified: false
    });

    res.json({
      success: true,
      message: 'Telegram desconectado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao desconectar Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desconectar o Telegram'
    });
  }
});

export default router; 