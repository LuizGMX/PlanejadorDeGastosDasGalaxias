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

    // Em desenvolvimento, não verifica código recente
    if (process.env.NODE_ENV === 'production') {
      // Verifica se já existe um código recente
      const recentCode = await VerificationCode.findOne({
        where: {
          email: user.email,
          expires_at: {
            [Op.gt]: new Date()
          }
        }
      });

      if (recentCode) {
        console.log('Código recente encontrado:', recentCode.code);
        return res.json({
          success: true,
          message: 'Código recente encontrado. Use o código abaixo:',
          code: recentCode.code,
          email: user.email,
          isRecent: true
        });
      }
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
      expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
    });

    // Envia o código por email
    await sendVerificationEmail(user.email, code);

    res.json({
      success: true,
      message: 'Código gerado com sucesso! Use-o no Telegram.',
      code: code,
      email: user.email,
      isRecent: false
    });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar código de verificação'
    });
  }
});

export default router; 