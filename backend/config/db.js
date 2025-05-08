import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/user.js';
import Category from '../models/category.js';
import Bank from '../models/bank.js';
import Expense from '../models/expense.js';
import Income from '../models/income.js';
import Budget from '../models/budget.js';
import VerificationCode from '../models/verificationCode.js';
import UserBank from '../models/userBank.js';
import RecurrenceRule from '../models/recurrenceRule.js';
import Payment from '../models/payment.js';
import FinancialGoal from '../models/financialGoal.js';
import ExpensesRecurrenceException from '../models/expensesRecurrenceException.js';
import IncomesRecurrenceException from '../models/incomesRecurrenceException.js';

dotenv.config();


// Create a new Sequelize instance to connect to the local database
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    },
    pool: {
      max: 20,              // Aumentado para 20 conexões máximas
      min: 5,               // Mínimo de 5 conexões mantidas
      acquire: 60000,       // 60 segundos para adquirir conexão
      idle: 10000,          // 10 segundos antes de liberar conexão ociosa
      evict: 30000,         // Verifica conexões a cada 30 segundos
      handleDisconnects: true // Lidar com desconexões automaticamente
    },
    dialectOptions: {
      connectTimeout: 60000,  // 60 segundos para timeout de conexão
      options: {
        requestTimeout: 60000 // 60 segundos para timeout de requisição
      },
      // Configurações adicionais de resiliência
      maxReconnects: 5,
      reconnectInterval: 2000, // 2 segundos entre tentativas
      keepDefaultTimezone: true,
      decimalNumbers: true,
      supportBigNumbers: true
    },
    retry: {
      max: 5,              // Tentar reconectar até 5 vezes
      match: [            // Tipos de erros que devem acionar reconexão
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeAccessDeniedError/,
        /Connection acquired/,
        /socket hang up/,
        /PROTOCOL_CONNECTION_LOST/
      ],
      backoffBase: 1000,   // Espera inicial de 1 segundo
      backoffExponent: 1.5 // Aumenta o tempo de espera exponencialmente
    }
  }
);

// Adicionar listeners para monitorar a conexão
sequelize
  .authenticate()
  .then(() => {
    console.log('👍 Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
  });

// Monitorar eventos de conexão
sequelize.connectionManager.on('disconnect', () => {
  console.warn('🔌 Conexão com o banco de dados perdida. Tentando reconectar...');
});

sequelize.connectionManager.on('reconnect', () => {
  console.log('🔄 Reconectado ao banco de dados com sucesso.');
});

// Configurar ping periódico para manter a conexão ativa
setInterval(async () => {
  try {
    await sequelize.query('SELECT 1+1 AS result');
    // console.log('💓 Ping ao banco de dados bem-sucedido');
  } catch (error) {
    console.error('❌ Erro no ping ao banco de dados:', error.message);
  }
}, 60000); // A cada 1 minuto

// Função para sincronizar o banco de dados
export const syncDatabase = async () => {
  try {
    // Sincronizar banco de dados na ordem correta
    await sequelize.sync({ force: false });
    
    // Criar tabelas na ordem correta
    await User.sync({ force: false });
    await Category.sync({ force: false });
    await Bank.sync({ force: false });
    await Expense.sync({ force: false });
    await Income.sync({ force: false });
    await Budget.sync({ force: false });
    await VerificationCode.sync({ force: false });
    await UserBank.sync({ force: false });
    await RecurrenceRule.sync({ force: false });
    await ExpensesRecurrenceException.sync({ force: false });
    await IncomesRecurrenceException.sync({ force: false });
    await Payment.sync({ force: false });
    await FinancialGoal.sync({ force: false });

    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar o banco de dados:', error);
    console.error('Detalhes do erro:', error.original || error);
    console.error('Conexão com host:', process.env.DB_HOST || 'localhost');
    throw error;
  }
};

// Função para testar a conexão
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    console.error('Detalhes do erro:', error.original || error);
    console.error('Conexão com host:', process.env.DB_HOST || 'localhost');
    console.error('Nome do banco:', process.env.DB_NAME || 'planejador');
    console.error('Usuário:', process.env.DB_USER || 'root');
    throw error;
  }
};

export default sequelize;