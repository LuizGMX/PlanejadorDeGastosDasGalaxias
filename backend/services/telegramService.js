import { Telegraf } from 'telegraf';
import { models } from '../models/index.js';
const { User, Expense, Income, Category, Bank, Budget, VerificationCode, UserBank } = models;
import { Op } from 'sequelize';
import { sendVerificationEmail } from './emailService.js';
import crypto from 'crypto';

// Função para gerar código de verificação
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

class TelegramService {
  constructor() {
    this.bot = null;
    this.isRunning = false;
    this.userStates = new Map();
    this.verificationCodes = new Map();
  }

  async getUserState(userId) {
    try {
      const state = this.userStates.get(userId);
      if (!state) return null;
      
      // Verifica se o estado expirou (1 hora)
      if (state.timestamp && Date.now() - state.timestamp > 3600000) {
        this.userStates.delete(userId);
        return null;
      }
      
      return state;
    } catch (error) {
      console.error('Erro ao obter estado do usuário:', error);
      return null;
    }
  }

  async setUserState(userId, state, data = {}) {
    try {
      this.userStates.set(userId, {
        state,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erro ao definir estado do usuário:', error);
    }
  }

  async clearUserState(userId) {
    try {
      this.userStates.delete(userId);
    } catch (error) {
      console.error('Erro ao limpar estado do usuário:', error);
    }
  }

  // Limpa estados expirados periodicamente
  cleanExpiredStates() {
    const now = Date.now();
    for (const [userId, state] of this.userStates.entries()) {
      if (state.timestamp && now - state.timestamp > 3600000) {
        this.userStates.delete(userId);
      }
    }
  }

  async init() {
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
      
      // Inicia limpeza periódica de estados
      setInterval(() => this.cleanExpiredStates(), 300000); // A cada 5 minutos
      
      // Inicia o bot com polling otimizado
      await this.bot.launch({
        dropPendingUpdates: true,
        allowedUpdates: ['message', 'callback_query']
      });

      this.isRunning = true;
      console.log('🤖 Bot do Telegram iniciado com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao iniciar bot do Telegram:', error);
      this.isRunning = false;
      this.bot = null;
      this.userStates.clear();
    }
  }

  async stop() {
    if (!this.bot) return;

    try {
      await this.bot.stop();
      this.bot = null;
      this.isRunning = false;
      this.userStates.clear();
      
      console.log('Bot do Telegram parado com sucesso!');
    } catch (error) {
      console.error('Erro ao parar bot do Telegram:', error);
      this.bot = null;
      this.isRunning = false;
      this.userStates.clear();
    }
  }

  setupTelegramBot() {
    if (!this.bot) return;

    // Configura os comandos
    this.bot.command('start', (ctx) => this.handleStart(ctx));
    this.bot.command('verificar', (ctx) => this.handleVerify(ctx));
    this.bot.command('despesa', (ctx) => this.handleExpense(ctx));
    this.bot.command('receita', (ctx) => this.handleIncome(ctx));
    this.bot.command('resumo', (ctx) => this.handleSummary(ctx));
    this.bot.command('help', (ctx) => this.handleHelp(ctx));
    this.bot.command('bancos', (ctx) => this.handleBancos(ctx));

    // Registra o handler geral de mensagens
    this.bot.on('message', async (ctx) => {
      try {
        // Se for um comando, ignora (já tratado pelos handlers específicos)
        if (ctx.message.text && ctx.message.text.startsWith('/')) {
          return;
        }
        
        const chatId = ctx.chat.id;
        const userState = await this.getUserState(chatId);

        if (!userState) {
          return;
        }
        
        // Verifica se está aguardando código de verificação
        if (userState.state === 'AWAITING_VERIFICATION_CODE') {
          await this.handleMessage(ctx);
          return;
        }

        const user = await User.findOne({
          where: { telegram_chat_id: chatId }
        });

        if (!user) {
          ctx.reply('Você precisa vincular sua conta primeiro. Use /start para começar.');
          return;
        }

        switch (userState.state) {
          case 'AWAITING_EXPENSE_AMOUNT':
            await this.handleExpenseAmount(ctx, user, userState);
            break;
          case 'AWAITING_EXPENSE_DESCRIPTION':
            await this.handleExpenseDescription(ctx, user, userState);
            break;
          case 'AWAITING_EXPENSE_CATEGORY':
            await this.handleExpenseCategory(ctx, user, userState);
            break;
          case 'AWAITING_EXPENSE_BANK':
            await this.handleExpenseBank(ctx, user, userState);
            break;
          case 'AWAITING_EXPENSE_PAYMENT_METHOD':
            await this.handleExpensePaymentMethod(ctx, user, userState);
            break;
          case 'AWAITING_EXPENSE_CONFIRMATION':
            await this.handleExpenseConfirmation(ctx, user, userState);
            break;
          case 'AWAITING_INCOME_AMOUNT':
            await this.handleIncomeAmount(ctx, user, userState);
            break;
          case 'AWAITING_INCOME_DESCRIPTION':
            await this.handleIncomeDescription(ctx, user, userState);
            break;
          case 'AWAITING_INCOME_CATEGORY':
            await this.handleIncomeCategory(ctx, user, userState);
            break;
          case 'AWAITING_INCOME_BANK':
            await this.handleIncomeBank(ctx, user, userState);
            break;
          case 'AWAITING_INCOME_CONFIRMATION':
            await this.handleIncomeConfirmation(ctx, user, userState);
            break;
          default:
            await this.handleMessage(ctx);
            break;
        }
      } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        ctx.reply('Ops! Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
      }
    });
  }

  async handleStart(ctx) {
    try {
      const chatId = ctx.chat.id;
      const telegramUsername = ctx.from.username;

      // Verifica se já existe um usuário com este chatId
      const existingUser = await User.findOne({
        where: { telegram_chat_id: chatId }
      });

      if (existingUser) {
        ctx.reply('Você já está conectado! Use /help para ver os comandos disponíveis. Você pode clicar nas opções em azul também');
        return;
      }

      // Solicita o código de verificação
      ctx.reply(
        'Bem-vindo ao Planejador de Despesas das Galáxias! 🚀\n\n' +
        'Para conectar sua conta, você vai precisar seguir dois passos simples:\n\n' +
        '1. Digite /verificar\n' +
        '2. Quando solicitado, envie o código de verificação que você recebeu no site\n\n' +
        'Vamos começar?'
      );
    } catch (error) {
      console.error('Erro no comando /start:', error);
      ctx.reply('Ops! Ocorreu um erro ao iniciar. Tente novamente mais tarde.');
    }
  }

  async handleVerify(ctx) {
    try {
      const chatId = ctx.chat.id;
      const user = await User.findOne({
        where: { telegram_chat_id: chatId }
      });

      if (user) {
        ctx.reply('Sua conta já está verificada! 🎉');
        return;
      }

      await this.setUserState(chatId, 'AWAITING_VERIFICATION_CODE');
      ctx.reply('Por favor, digite o código de verificação que você gerou no site.');
    } catch (error) {
      console.error('Erro ao iniciar verificação:', error);
      ctx.reply('Desculpe, ocorreu um erro ao iniciar a verificação. Por favor, tente novamente.');
    }
  }

  async handleMessage(ctx) {
    try {
      const chatId = ctx.chat.id;
      const userState = await this.getUserState(chatId);

      if (!userState) {
        return;
      }

      if (userState.state === 'AWAITING_VERIFICATION_CODE') {
        const code = ctx.message.text.trim();

        // Busca o código de verificação
        const verificationCode = await VerificationCode.findOne({
          where: {
            code: code,
            expires_at: {
              [Op.gt]: new Date()
            },
            used: false
          }
        });

        if (!verificationCode) {
          ctx.reply('Código inválido ou expirado. Por favor, gere um novo código no site.');
          return;
        }

        // Busca o usuário pelo email
        const user = await User.findOne({
          where: {
            email: verificationCode.email
          }
        });

        if (!user) {
          ctx.reply('Usuário não encontrado. Por favor, tente novamente.');
          return;
        }

        // Atualiza o usuário com os dados do Telegram
        await user.update({
          telegram_chat_id: chatId,
          telegram_username: ctx.from.username || null,
          telegram_verified: true
        });

        // Marca o código como usado
        await verificationCode.update({
          used: true
        });

        // Limpa o estado do usuário
        await this.clearUserState(chatId);

        ctx.reply('Conta verificada com sucesso! 🎉\n\nComandos disponíveis:\n\n' +
          '/despesa - Registrar uma nova despesa\n' +
          '/receita - Registrar uma nova receita\n' +
          '/resumo - Ver resumo das despesas\n' +
          '/ajuda - Ver todos os comandos disponíveis\n\n' +
          'Você pode clicar nas opções em azul também para usar os comandos');
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      ctx.reply('Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
    }
  }

  async handleExpense(ctx) {
    try {
      const chatId = ctx.chat.id;
      const user = await User.findOne({
        where: { telegram_chat_id: chatId, telegram_verified: true }
      });

      if (!user) {
        ctx.reply('Você precisa vincular sua conta primeiro. Use /start para começar.');
        return;
      }
      
      // Verificar se o usuário tem pelo menos um banco ativo
      const hasActiveBanks = await UserBank.count({
        where: { 
          user_id: user.id,
          is_active: true
        }
      }) > 0;
      
      if (!hasActiveBanks) {
        // Verificar se tem bancos inativos
        const inactiveBanks = await UserBank.count({
          where: { 
            user_id: user.id,
            is_active: false
          }
        });
        
        let message = '❌ Você não tem bancos ativos cadastrados.\n';
        
        if (inactiveBanks > 0) {
          message += 'Você possui bancos inativos que podem ser reativados.\n';
        }
        
        message += 'Acesse o site em "Perfil > Bancos" para adicionar ou ativar bancos à sua conta.';
        ctx.reply(message);
        return;
      }

      // Inicia o fluxo de registro de despesa
      await this.setUserState(chatId, 'AWAITING_EXPENSE_AMOUNT', {
        user_id: user.id
      });

      ctx.reply('💰 Digite o valor da despesa:');
    } catch (error) {
      console.error('Erro ao iniciar registro de despesa:', error);
      ctx.reply('Ops! Ocorreu um erro. Tente novamente mais tarde.');
    }
  }

  async handleIncome(ctx) {
    try {
      const chatId = ctx.chat.id;
      const user = await User.findOne({
        where: { telegram_chat_id: chatId, telegram_verified: true }
      });

      if (!user) {
        ctx.reply('Você precisa vincular sua conta primeiro. Use /start para começar.');
        return;
      }
      
      // Verificar se o usuário tem pelo menos um banco ativo
      const hasActiveBanks = await UserBank.count({
        where: { 
          user_id: user.id,
          is_active: true
        }
      }) > 0;
      
      if (!hasActiveBanks) {
        // Verificar se tem bancos inativos
        const inactiveBanks = await UserBank.count({
          where: { 
            user_id: user.id,
            is_active: false
          }
        });
        
        let message = '❌ Você não tem bancos ativos cadastrados.\n';
        
        if (inactiveBanks > 0) {
          message += 'Você possui bancos inativos que podem ser reativados.\n';
        }
        
        message += 'Acesse o site em "Perfil > Bancos" para adicionar ou ativar bancos à sua conta.';
        ctx.reply(message);
        return;
      }

      // Inicia o fluxo de registro de receita
      await this.setUserState(chatId, 'AWAITING_INCOME_AMOUNT', {
        user_id: user.id
      });

      ctx.reply('💰 Digite o valor da receita:');
    } catch (error) {
      console.error('Erro ao iniciar registro de receita:', error);
      ctx.reply('Ops! Ocorreu um erro. Tente novamente mais tarde.');
    }
  }

  async handleSummary(ctx) {
    try {
      const chatId = ctx.chat.id;
      const user = await User.findOne({
        where: { telegram_chat_id: chatId }
      });

      if (!user) {
        ctx.reply('Você precisa vincular sua conta primeiro. Use /start para começar.');
        return;
      }

      // Busca as despesas e receitas do mês atual
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const now = new Date();
      const remainingDays = endOfMonth.getDate() - now.getDate() + 1;

      const [expenses, incomes] = await Promise.all([
        Expense.sum('amount', {
          where: {
            user_id: user.id,
            expense_date: {
              [Op.between]: [startOfMonth, endOfMonth]
            }
          }
        }),
        Income.sum('amount', {
          where: {
            user_id: user.id,
            date: {
              [Op.between]: [startOfMonth, endOfMonth]
            }
          }
        })
      ]);

      const totalExpenses = expenses || 0;
      const totalIncomes = incomes || 0;
      const balance = totalIncomes - totalExpenses;

      // Calcula o orçamento restante
      const remainingBudget = user.desired_budget - totalExpenses;
      const dailyBudget = remainingBudget / remainingDays;

      const message = `
💡 Análise do Orçamento:
📅 Dias restantes no mês: ${remainingDays}
✨ Orçamento restante: R$ ${remainingBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${dailyBudget > 0 
  ? `💫 Você ainda pode gastar R$ ${dailyBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por dia até o final do mês, para se manter no seu orçamento`
  : `⚠️ Atenção! Você já ultrapassou seu orçamento em R$ ${Math.abs(remainingBudget).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}

📊 Resumo do Mês:
💰 Receitas: R$ ${totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
💸 Despesas: R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${balance >= 0 
  ? `✅ Saldo: R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `❌ Saldo: -R$ ${Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
`;

      ctx.reply(message);
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      ctx.reply('Ops! Ocorreu um erro ao gerar o resumo. Tente novamente mais tarde.');
    }
  }

  async handleHelp(ctx) {
    try {
      const chatId = ctx.chat.id;
      
      // Verifica se o usuário está autenticado
      const user = await User.findOne({
        where: { 
          telegram_chat_id: chatId,
          telegram_verified: true
        }
      });
      
      if (!user) {
        // Usuário não autenticado - mostrar comandos básicos
        ctx.reply(
          '🚀 Comandos disponíveis:\n\n' +
          '/start - Iniciar o bot\n' +
          '/verificar - Verificar sua conta\n' +
          '/help - Mostrar esta ajuda'
        );
        return;
      }
      
      // Usuário autenticado - verificar se tem bancos ativos
      const hasActiveBanks = await UserBank.count({
        where: { 
          user_id: user.id,
          is_active: true
        }
      }) > 0;
      
      // Montar a lista de comandos disponíveis
      let message = '🚀 Comandos disponíveis: Você pode clicar nas opções em azul também\n\n';
      
      // Comandos básicos para todos os usuários autenticados
      message += '/bancos - Listar seus bancos cadastrados\n';
      message += '/help - Mostrar esta ajuda\n';
      
      // Comandos que requerem bancos ativos
      if (hasActiveBanks) {
        message += '\n📊 Comandos financeiros:\n';
        message += '/despesa - Registrar uma nova despesa\n';
        message += '/receita - Registrar uma nova receita\n';
        message += '/resumo - Ver resumo financeiro do mês\n';
      } else {
        message += '\n⚠️ Para acessar mais comandos, você precisa ter pelo menos um banco ativo.\n';
        message += 'Acesse o site em "Perfil > Bancos" para ativar seus bancos.';
      }
      
      ctx.reply(message);
    } catch (error) {
      console.error('Erro ao processar comando de ajuda:', error);
      ctx.reply('Ops! Ocorreu um erro ao processar o comando. Tente novamente mais tarde.');
    }
  }

  async handleExpenseAmount(ctx, user, userState) {
    const amount = parseFloat(ctx.message.text.replace(',', '.'));
    
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('❌ Por favor, digite um valor válido maior que zero.');
      return;
    }

    await this.setUserState(ctx.chat.id, 'AWAITING_EXPENSE_DESCRIPTION', {
      ...userState.data,
      amount
    });

    ctx.reply('📝 Digite uma descrição para a despesa:');
  }

  async handleExpenseDescription(ctx, user, userState) {
    const description = ctx.message.text.trim();
    
    if (description.length < 3) {
      ctx.reply('❌ A descrição deve ter pelo menos 3 caracteres.');
      return;
    }

    // Busca as categorias de despesa
    const categories = await Category.findAll({
      where: { type: 'expense' },
      order: [['category_name', 'ASC']]
    });

    if (!categories || categories.length === 0) {
      ctx.reply('❌ Erro: Não há categorias de despesa cadastradas.');
      return;
    }

    const categoriesMessage = categories
      .map((category, index) => `${index + 1}. ${category.category_name}`)
      .join('\n');

    await this.setUserState(ctx.chat.id, 'AWAITING_EXPENSE_CATEGORY', {
      ...userState.data,
      description,
      categories: categories.map(c => ({
        id: c.id,
        name: c.category_name
      }))
    });

    ctx.reply(`📑 Escolha a categoria:\n\n${categoriesMessage}`);
  }

  async handleExpenseCategory(ctx, user, userState) {
    const choice = parseInt(ctx.message.text) - 1;
    
    if (isNaN(choice) || choice < 0 || choice >= userState.data.categories.length) {
      ctx.reply('❌ Categoria inválida. Por favor, escolha uma das opções listadas.');
      return;
    }

    const category = userState.data.categories[choice];

    // Busca os bancos ativos do usuário
    console.log(`Buscando bancos ativos para despesa - usuário ${user.id}...`);
    
    try {
      const userBanks = await UserBank.findAll({
        where: { 
          user_id: user.id,
          is_active: true
        },
        include: [{
          model: Bank,
          as: 'bank'
        }]
      });

      console.log(`Total de bancos ativos encontrados para despesa: ${userBanks ? userBanks.length : 0}`);

      if (!userBanks || userBanks.length === 0) {
        // Verificar se há bancos inativos
        const inactiveBanks = await UserBank.findAll({
          where: { 
            user_id: user.id,
            is_active: false
          }
        });
        
        let message = '❌ Você não tem bancos ativos cadastrados.\n';
        
        if (inactiveBanks && inactiveBanks.length > 0) {
          message += 'Você possui bancos inativos que podem ser reativados.\n';
        }
        
        message += 'Acesse o site em "Perfil > Bancos" para adicionar ou ativar bancos à sua conta.';
        ctx.reply(message);
        return;
      }

      const banksMessage = userBanks
        .map((userBank, index) => `${index + 1}. ${userBank.bank.name}`)
        .join('\n');

      await this.setUserState(ctx.chat.id, 'AWAITING_EXPENSE_BANK', {
        ...userState.data,
        category_id: category.id,
        category_name: category.category_name,
        banks: userBanks.map(userBank => ({
          id: userBank.bank.id,
          name: userBank.bank.name,
          code: userBank.bank.code
        }))
      });
      
      ctx.reply(`🏦 Selecione o banco para a despesa:\n\n${banksMessage}`);
    } catch (error) {
      console.error('Erro ao buscar bancos ativos para despesa:', error);
      ctx.reply('❌ Erro ao buscar seus bancos. Por favor, tente novamente mais tarde.');
    }
  }

  async handleExpenseBank(ctx, user, userState) {
    const choice = parseInt(ctx.message.text) - 1;
    
    if (isNaN(choice) || choice < 0 || choice >= userState.data.banks.length) {
      ctx.reply('❌ Banco inválido. Por favor, escolha uma das opções listadas.');
      return;
    }

    const bank = userState.data.banks[choice];

    await this.setUserState(ctx.chat.id, 'AWAITING_EXPENSE_PAYMENT_METHOD', {
      ...userState.data,
      bank_id: bank.id
    });

    const paymentMessage = `
💳 Escolha a forma de pagamento:

1. Cartão de Crédito
2. Cartão de Débito
3. Pix
4. Dinheiro
`;

    ctx.reply(paymentMessage);
  }

  async handleExpensePaymentMethod(ctx, user, userState) {
    const choice = parseInt(ctx.message.text);
    let paymentMethod;
    
    switch (choice) {
      case 1:
        paymentMethod = 'credit_card';
        break;
      case 2:
        paymentMethod = 'debit_card';
        break;
      case 3:
        paymentMethod = 'pix';
        break;
      case 4:
        paymentMethod = 'money';
        break;
      default:
        ctx.reply('❌ Opção inválida. Por favor, escolha uma das opções listadas.');
        return;
    }

    await this.setUserState(ctx.chat.id, 'AWAITING_EXPENSE_CONFIRMATION', {
      ...userState.data,
      payment_method: paymentMethod,
      is_in_cash: paymentMethod === 'money'
    });

    const paymentMethodNames = {
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'Pix',
      money: 'Dinheiro'
    };

    const bank = userState.data.banks.find(b => b.id === userState.data.bank_id);

    const confirmationMessage = `
📋 Confirme os dados da despesa:

Valor: R$ ${userState.data.amount.toFixed(2)}
Descrição: ${userState.data.description}
Categoria: ${userState.data.category_name}
Banco: ${bank.name}
Forma de Pagamento: ${paymentMethodNames[paymentMethod]}

Digite SIM para confirmar ou NÃO para cancelar.
`;

    ctx.reply(confirmationMessage);
  }

  async handleExpenseConfirmation(ctx, user, userState) {
    const confirmation = ctx.message.text.trim().toUpperCase();

    if (confirmation === 'SIM') {
      try {
        // Cria a despesa
        await Expense.create({
          user_id: user.id,
          amount: userState.data.amount,
          description: userState.data.description,
          category_id: userState.data.category_id,
          bank_id: userState.data.bank_id,
          payment_method: userState.data.payment_method,
          expense_date: new Date(),
          is_in_cash: false,
          has_installments: false,
          is_recurring: false
        });

        ctx.reply('✅ Despesa registrada com sucesso!\n\nUse /help para ver mais opções.');
      } catch (error) {
        console.error('Erro ao registrar despesa:', error);
        ctx.reply('❌ Ocorreu um erro ao registrar a despesa. Tente novamente mais tarde.');
      }
    } else if (confirmation === 'NÃO') {
      ctx.reply('❌ Operação cancelada.\n\nUse /help para ver as opções disponíveis.');
    } else {
      ctx.reply('❌ Por favor, digite SIM para confirmar ou NÃO para cancelar.');
      return;
    }

    await this.clearUserState(ctx.chat.id);
  }

  async handleIncomeAmount(ctx, user, userState) {
    const amount = parseFloat(ctx.message.text.replace(',', '.'));
    
    if (isNaN(amount) || amount <= 0) {
      ctx.reply('❌ Por favor, digite um valor válido maior que zero.');
      return;
    }

    await this.setUserState(ctx.chat.id, 'AWAITING_INCOME_DESCRIPTION', {
      ...userState.data,
      amount
    });

    ctx.reply('📝 Digite uma descrição para a receita:');
  }

  async handleIncomeDescription(ctx, user, userState) {
    const description = ctx.message.text.trim();
    
    if (description.length < 3) {
      ctx.reply('❌ A descrição deve ter pelo menos 3 caracteres.');
      return;
    }

    // Busca as categorias de receita
    const categories = await Category.findAll({
      where: { type: 'income' },
      order: [['category_name', 'ASC']]
    });

    if (!categories || categories.length === 0) {
      ctx.reply('❌ Erro: Não há categorias de receita cadastradas.');
      return;
    }

    const categoriesMessage = categories
      .map((category, index) => `${index + 1}. ${category.category_name}`)
      .join('\n');

    await this.setUserState(ctx.chat.id, 'AWAITING_INCOME_CATEGORY', {
      ...userState.data,
      description,
      categories: categories.map(c => ({
        id: c.id,
        name: c.category_name
      }))
    });

    ctx.reply(`📑 Escolha a categoria:\n\n${categoriesMessage}`);
  }

  async handleIncomeCategory(ctx, user, userState) {
    const choice = parseInt(ctx.message.text) - 1;
    
    if (isNaN(choice) || choice < 0 || choice >= userState.data.categories.length) {
      ctx.reply('❌ Categoria inválida. Por favor, escolha uma das opções listadas.');
      return;
    }

    const category = userState.data.categories[choice];

    // Busca os bancos ativos do usuário
    console.log(`Buscando bancos ativos para receita - usuário ${user.id}...`);
    
    try {
      const userBanks = await UserBank.findAll({
        where: { 
          user_id: user.id,
          is_active: true
        },
        include: [{
          model: Bank,
          as: 'bank'
        }]
      });

      console.log(`Total de bancos ativos encontrados para receita: ${userBanks ? userBanks.length : 0}`);

      if (!userBanks || userBanks.length === 0) {
        // Verificar se há bancos inativos
        const inactiveBanks = await UserBank.findAll({
          where: { 
            user_id: user.id,
            is_active: false
          }
        });
        
        let message = '❌ Você não tem bancos ativos cadastrados.\n';
        
        if (inactiveBanks && inactiveBanks.length > 0) {
          message += 'Você possui bancos inativos que podem ser reativados.\n';
        }
        
        message += 'Acesse o site em "Perfil > Bancos" para adicionar ou ativar bancos à sua conta.';
        ctx.reply(message);
        return;
      }

      const banksMessage = userBanks
        .map((userBank, index) => `${index + 1}. ${userBank.bank.name}`)
        .join('\n');

      await this.setUserState(ctx.chat.id, 'AWAITING_INCOME_BANK', {
        ...userState.data,
        category_id: category.id,
        category_name: category.category_name,
        banks: userBanks.map(userBank => ({
          id: userBank.bank.id,
          name: userBank.bank.name,
          code: userBank.bank.code
        }))
      });
      
      ctx.reply(`🏦 Selecione o banco para a receita:\n\n${banksMessage}`);
    } catch (error) {
      console.error('Erro ao buscar bancos ativos para receita:', error);
      ctx.reply('❌ Erro ao buscar seus bancos. Por favor, tente novamente mais tarde.');
    }
  }

  async handleIncomeBank(ctx, user, userState) {
    const choice = parseInt(ctx.message.text) - 1;
    
    if (isNaN(choice) || choice < 0 || choice >= userState.data.banks.length) {
      ctx.reply('❌ Banco inválido. Por favor, escolha uma das opções listadas.');
      return;
    }

    const bank = userState.data.banks[choice];

    await this.setUserState(ctx.chat.id, 'AWAITING_INCOME_CONFIRMATION', {
      ...userState.data,
      bank_id: bank.id
    });

    const confirmationMessage = `
📋 Confirme os dados da receita:

Valor: R$ ${userState.data.amount.toFixed(2)}
Descrição: ${userState.data.description}
Categoria: ${userState.data.category_name}
Banco: ${bank.code} - ${bank.name}

Digite SIM para confirmar ou NÃO para cancelar.
`;

    ctx.reply(confirmationMessage);
  }

  async handleIncomeConfirmation(ctx, user, userState) {
    const confirmation = ctx.message.text.trim().toUpperCase();

    if (confirmation === 'SIM') {
      try {
        // Cria a receita
        await Income.create({
          user_id: user.id,
          amount: userState.data.amount,
          description: userState.data.description,
          category_id: userState.data.category_id,
          bank_id: userState.data.bank_id,
          date: new Date()
        });

        ctx.reply('✅ Receita registrada com sucesso!\n\nUse /help para ver mais opções.');
      } catch (error) {
        console.error('Erro ao registrar receita:', error);
        ctx.reply('❌ Ocorreu um erro ao registrar a receita. Tente novamente mais tarde.');
      }
    } else if (confirmation === 'NÃO') {
      ctx.reply('❌ Operação cancelada.\n\nUse /help para ver as opções disponíveis.');
    } else {
      ctx.reply('❌ Por favor, digite SIM para confirmar ou NÃO para cancelar.');
      return;
    }

    await this.clearUserState(ctx.chat.id);
  }

  async handleBancos(ctx) {
    try {
      const chatId = ctx.chat.id;
      
      // Busca o usuário pelo chat ID com seus bancos relacionados
      const user = await User.findOne({
        where: { 
          telegram_chat_id: chatId,
          telegram_verified: true
        }
      });
      
      if (!user) {
        ctx.reply(
          'Você precisa verificar sua conta antes de usar este comando.\n' +
          'Use /verificar para conectar sua conta.'
        );
        return;
      }

      console.log(`Buscando bancos para listagem - usuário ${user.id}...`);
      
      // Busca os bancos através da tabela de relacionamento - APENAS ATIVOS
      const userBanks = await UserBank.findAll({
        where: { 
          user_id: user.id,
          is_active: true
        },
        include: [{
          model: Bank,
          as: 'bank'
        }]
      });

      console.log(`Total de bancos encontrados para listagem: ${userBanks ? userBanks.length : 0}`);
      
      if (!userBanks || userBanks.length === 0) {
        // Verifica se há bancos inativos para exibir uma mensagem mais precisa
        const inactiveBanks = await UserBank.findAll({
          where: { 
            user_id: user.id,
            is_active: false
          },
          include: [{
            model: Bank,
            as: 'bank'
          }]
        });
        
        console.log(`Bancos inativos encontrados para listagem: ${inactiveBanks ? inactiveBanks.length : 0}`);
        
        let message = '❌ Você não tem bancos ativos cadastrados.\n';
        
        if (inactiveBanks && inactiveBanks.length > 0) {
          message += 'Você possui bancos inativos que podem ser reativados.\n';
          console.log('Bancos inativos existentes:', JSON.stringify(inactiveBanks.map(b => b.bank?.name), null, 2));
        }
        
        message += 'Acesse o site em "Perfil > Bancos" para adicionar ou ativar bancos à sua conta.';
        ctx.reply(message);
        return;
      }
      
      // Formata a mensagem com os bancos
      let message = '🏦 *Seus Bancos Ativos*\n\n';
      
      userBanks.forEach((userBank, index) => {
        message += `${index + 1}. *${userBank.bank.name}* (${userBank.bank.code})\n`;
      });
      
      message += '\nPara adicionar ou remover bancos, acesse o site em "Perfil > Bancos".';
      
      // Envia a mensagem formatada
      ctx.replyWithMarkdown(message);
      
    } catch (error) {
      console.error('Erro ao processar comando de bancos:', error);
      ctx.reply('Ops! Ocorreu um erro ao listar seus bancos. Tente novamente mais tarde.');
    }
  }
}

// Criar e exportar uma instância do TelegramService
const telegramService = new TelegramService();
export { telegramService }; 