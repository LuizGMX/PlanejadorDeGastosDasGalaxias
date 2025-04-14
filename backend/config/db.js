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
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    }
  }
);

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
    await RecurrenceException.sync({ force: false });
    await Payment.sync({ force: false });
    await FinancialGoal.sync({ force: false });

    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar o banco de dados:', error);
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
    throw error;
  }
};

export default sequelize;