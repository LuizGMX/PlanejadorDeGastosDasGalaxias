import { Telegraf } from 'telegraf';
import { User } from '../models/index.js';
import { Op } from 'sequelize';
import { sendVerificationEmail } from './emailService.js';
import crypto from 'crypto';

class TelegramService {
  constructor() {
    this.bot = null;
    this.isRunning = false;
    this.userStates = new Map();
    this.verificationCodes = new Map(); // Armazena os códigos de verificação
  }

  // Gera um código de verificação de 6 dígitos
  generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  async start() {
    if (this.isRunning) {
      console.log('🤖 Bot do Telegram já está rodando.');
      return;
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN não configurado. O bot do Telegram não será iniciado.');
      return;
    }

    try {
      // Força a parada de qualquer instância anterior
      await this.stop();

      // Aguarda um momento para garantir que tudo foi limpo
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Cria uma nova instância do bot
      this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      
      // Configura os comandos
      await this.setupTelegramBot();
      
      // Inicia o bot com polling otimizado
      await this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ['message', 'callback_query'],
        polling: {
          timeout: 30,
          limit: 100
        }
      });

      this.isRunning = true;
      console.log('🤖 Bot do Telegram iniciado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao iniciar bot do Telegram:', error);
      this.isRunning = false;
      this.bot = null;
      this.userStates.clear();
      this.verificationCodes.clear();
    }
  }

  async stop() {
    console.log('🛑 Iniciando processo de parada do bot...');
    
    try {
      if (this.bot) {
        // Para o polling e limpa updates pendentes
        await this.bot.stop('SIGTERM');
        
        // Limpa todas as referências
        this.bot.telegram = null;
        this.bot = null;
      }
      
      // Limpa estados
      this.isRunning = false;
      this.userStates.clear();
      this.verificationCodes.clear();
      
      console.log('✅ Bot do Telegram parado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao parar bot do Telegram:', error);
    } finally {
      // Garante que tudo seja limpo mesmo com erro
      this.bot = null;
      this.isRunning = false;
      this.userStates.clear();
      this.verificationCodes.clear();
    }
  }

  // Método para processar updates do webhook
  async handleUpdate(update) {
    if (!this.bot) {
      console.error('Bot não está inicializado');
      return;
    }

    try {
      await this.bot.handleUpdate(update);
    } catch (error) {
      console.error('Erro ao processar update do Telegram:', error);
    }
  }

  async setupTelegramBot() {
    if (!this.bot) return;

    // Comando /start
    this.bot.command('start', async (ctx) => {
      try {
        const telegramUsername = ctx.message.from.username;
        if (!telegramUsername) {
          await ctx.reply('❌ Você precisa ter um nome de usuário configurado no Telegram para usar este bot.');
          return;
        }

        // Tenta encontrar usuário pelo username do Telegram
        const user = await User.findOne({
          where: {
            telegram_username: telegramUsername
          }
        });

        if (user) {
          await ctx.reply('✅ Sua conta já está vinculada ao sistema!');
          return;
        }

        // Tenta encontrar usuário pelo número de telefone
        const phoneNumber = ctx.message.from.id.toString();
        const userByPhone = await User.findOne({
          where: {
            phone_number: phoneNumber
          }
        });

        if (userByPhone) {
          // Atualiza o username do Telegram
          await User.update(
            { telegram_username: telegramUsername },
            { where: { id: userByPhone.id } }
          );
          await ctx.reply('✅ Conta vinculada com sucesso!');
          return;
        }

        // Se não encontrou o usuário, pede o código de verificação
        await ctx.reply('Para vincular sua conta, preciso verificar seu email. Use o comando /verificar para receber um código no seu email.');

      } catch (error) {
        console.error('Erro no comando /start:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar seu comando. Tente novamente mais tarde.');
      }
    });

    // Comando /verificar
    this.bot.command('verificar', async (ctx) => {
      try {
        const telegramUsername = ctx.message.from.username;
        if (!telegramUsername) {
          await ctx.reply('❌ Você precisa ter um nome de usuário configurado no Telegram para usar este bot.');
          return;
        }

        // Busca usuário pelo username do Telegram
        const user = await User.findOne({
          where: {
            telegram_username: null, // Procura usuário que ainda não tem Telegram vinculado
            phone_number: { [Op.not]: null } // Mas já tem número cadastrado
          }
        });

        if (!user) {
          await ctx.reply('❌ Não encontrei nenhuma conta pendente de vinculação. Certifique-se de ter cadastrado seu número de telefone no site primeiro.');
          return;
        }

        // Gera código de verificação
        const verificationCode = this.generateVerificationCode();
        
        // Armazena o código e username do Telegram
        this.verificationCodes.set(verificationCode, {
          telegramUsername,
          userId: user.id,
          timestamp: Date.now()
        });

        // Envia o código por email
        await sendVerificationEmail(user.email, verificationCode);

        await ctx.reply('✅ Um código de verificação foi enviado para seu email cadastrado no sistema. Use o comando /codigo XXXXXX para validar (substitua XXXXXX pelo código recebido).');

      } catch (error) {
        console.error('Erro no comando /verificar:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar seu comando. Tente novamente mais tarde.');
      }
    });

    // Comando /codigo
    this.bot.command('codigo', async (ctx) => {
      try {
        const code = ctx.message.text.split(' ')[1];
        if (!code) {
          await ctx.reply('❌ Por favor, forneça o código de verificação. Exemplo: /codigo 123456');
          return;
        }

        const verification = this.verificationCodes.get(code);
        if (!verification) {
          await ctx.reply('❌ Código inválido ou expirado. Use /verificar para gerar um novo código.');
          return;
        }

        // Verifica se o código não expirou (30 minutos)
        if (Date.now() - verification.timestamp > 30 * 60 * 1000) {
          this.verificationCodes.delete(code);
          await ctx.reply('❌ Código expirado. Use /verificar para gerar um novo código.');
          return;
        }

        // Atualiza o username do Telegram no usuário
        const telegramUsername = ctx.message.from.username;
        if (telegramUsername !== verification.telegramUsername) {
          await ctx.reply('❌ Este código não pertence a este usuário do Telegram.');
          return;
        }

        await User.update(
          { telegram_username: telegramUsername },
          { where: { id: verification.userId } }
        );

        // Limpa o código usado
        this.verificationCodes.delete(code);

        await ctx.reply('✅ Conta vinculada com sucesso! Agora você pode usar o bot para registrar gastos e ganhos.');

      } catch (error) {
        console.error('Erro no comando /codigo:', error);
        await ctx.reply('❌ Ocorreu um erro ao processar seu comando. Tente novamente mais tarde.');
      }
    });

    // Comando /ajuda
    this.bot.command('ajuda', async (ctx) => {
      const helpMessage = `
📋 Comandos disponíveis:

/start - Inicia o processo de vinculação
/verificar - Solicita um código de verificação por email
/codigo XXXXXX - Valida o código recebido
/ajuda - Mostra esta mensagem de ajuda
      `;
      await ctx.reply(helpMessage);
    });

    // Processa todas as mensagens
    this.bot.on('message', async (ctx) => {
      try {
        await this.handleMessage(ctx);
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        ctx.reply('Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
      }
    });
  }

  async handleMessage(ctx) {
    const user = await User.findOne({
      where: {
        phone_number: ctx.from.username ? `+${ctx.from.username}` : null,
        telegram_verified: true
      }
    });

    if (!user) {
      ctx.reply('Desculpe, você precisa vincular sua conta pelo site primeiro.');
      return;
    }

    const userState = await this.getUserState(ctx.from.id);
    
    if (!userState) {
      ctx.reply('Olá! O que você deseja fazer?\n1 - Cadastrar gasto\n2 - Cadastrar ganho');
      await this.setUserState(ctx.from.id, 'AWAITING_TYPE');
      return;
    }

    switch (userState.state) {
      case 'AWAITING_TYPE':
        await this.handleTypeSelection(ctx, user);
        break;
      case 'AWAITING_AMOUNT':
        await this.handleAmount(ctx, user, userState);
        break;
      case 'AWAITING_DESCRIPTION':
        await this.handleDescription(ctx, user, userState);
        break;
      case 'AWAITING_CONFIRMATION':
        await this.handleConfirmation(ctx, user, userState);
        break;
      default:
        ctx.reply('Olá! O que você deseja fazer?\n1 - Cadastrar gasto\n2 - Cadastrar ganho');
        await this.setUserState(ctx.from.id, 'AWAITING_TYPE');
    }
  }

  async handleTypeSelection(ctx, user) {
    const choice = ctx.message.text.trim();
    
    if (choice === '1' || choice === '2') {
      const type = choice === '1' ? 'expense' : 'income';
      await this.setUserState(ctx.from.id, 'AWAITING_AMOUNT', { type });
      ctx.reply('Por favor, digite o valor:');
    } else {
      ctx.reply('Opção inválida. Digite 1 para gasto ou 2 para ganho.');
    }
  }

  async handleAmount(ctx, user, userState) {
    const amount = parseFloat(ctx.message.text.replace(',', '.'));
    
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('Por favor, digite um valor válido maior que zero.');
      return;
    }

    await this.setUserState(ctx.from.id, 'AWAITING_DESCRIPTION', {
      ...userState.data,
      amount
    });
    
    ctx.reply('Digite uma descrição para o registro:');
  }

  async handleDescription(ctx, user, userState) {
    const description = ctx.message.text.trim();
    
    if (description.length < 3) {
      ctx.reply('Por favor, digite uma descrição com pelo menos 3 caracteres.');
      return;
    }

    const data = {
      ...userState.data,
      description
    };

    await this.setUserState(ctx.from.id, 'AWAITING_CONFIRMATION', data);
    
    const type = data.type === 'expense' ? 'gasto' : 'ganho';
    ctx.reply(
      `Confirme os dados:\nTipo: ${type}\nValor: R$ ${data.amount.toFixed(2)}\nDescrição: ${data.description}\n\nDigite SIM para confirmar ou NÃO para cancelar.`
    );
  }

  async handleConfirmation(ctx, user, userState) {
    const confirmation = ctx.message.text.trim().toUpperCase();
    
    if (confirmation === 'SIM') {
      try {
        const data = {
          user_id: user.id,
          amount: userState.data.amount,
          description: userState.data.description,
          date: new Date()
        };

        if (userState.data.type === 'expense') {
          await Expense.create({
            ...data,
            category_id: 1, // Categoria padrão
            subcategory_id: 1, // Subcategoria padrão
            bank_id: 1, // Banco padrão
            payment_method: 'pix'
          });
        } else {
          await Income.create(data);
        }

        ctx.reply('Registro criado com sucesso!');
      } catch (error) {
        console.error('Erro ao criar registro:', error);
        ctx.reply('Desculpe, ocorreu um erro ao criar o registro. Tente novamente mais tarde.');
      }
    } else if (confirmation === 'NÃO') {
      ctx.reply('Operação cancelada.');
    } else {
      ctx.reply('Por favor, digite SIM para confirmar ou NÃO para cancelar.');
      return;
    }

    await this.clearUserState(ctx.from.id);
    ctx.reply('Digite 1 para cadastrar gasto ou 2 para cadastrar ganho:');
    await this.setUserState(ctx.from.id, 'AWAITING_TYPE');
  }

  async getUserState(userId) {
    return this.userStates.get(userId);
  }

  async setUserState(userId, state, data = {}) {
    this.userStates.set(userId, { state, data });
  }

  async clearUserState(userId) {
    this.userStates.delete(userId);
  }
}

// Cria uma única instância do serviço
const telegramService = new TelegramService();

// Exporta a instância única
export default telegramService; 