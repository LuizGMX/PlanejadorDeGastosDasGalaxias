// models/index.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import User from './user.js';
import Category from './category.js';
import Bank from './bank.js';
import Expense from './expense.js';
import Income from './income.js';
import Budget from './budget.js';
import VerificationCode from './verificationCode.js';
import UserBank from './userBank.js';
import RecurrenceRule from './recurrenceRule.js';
import ExpensesRecurrenceException from './expensesRecurrenceException.js';
import IncomesRecurrenceException from './incomesRecurrenceException.js';
import Payment from './payment.js';
import FinancialGoal from './financialGoal.js';
import AuditLog from './auditLog.js';

// Configurações do banco de dados
dotenv.config();
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log, // Ativado para debug
    define: {
      timestamps: true,
      underscored: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    pool: {
      max: 10, // Aumentado para 10 conexões
      min: 0,
      acquire: 60000, // 60 segundos
      idle: 20000 // 20 segundos
    },
    dialectOptions: {
      connectTimeout: 120000, // 120 segundos
      statement_timeout: 120000,
      idle_in_transaction_session_timeout: 120000
    },
    retry: {
      max: 3 // Tentativas de reconexão
    }
  }
);

// Definição dos modelos
const models = {
  User: User(sequelize),
  Category: Category(sequelize),
  Bank: Bank(sequelize),
  Expense: Expense(sequelize),
  Income: Income(sequelize),
  Budget: Budget(sequelize),
  VerificationCode: VerificationCode(sequelize),
  UserBank: UserBank(sequelize),
  RecurrenceRule: RecurrenceRule(sequelize),
  ExpensesRecurrenceException: ExpensesRecurrenceException(sequelize),
  IncomesRecurrenceException: IncomesRecurrenceException(sequelize),
  Payment: Payment(sequelize),
  FinancialGoal: FinancialGoal(sequelize),
  AuditLog: AuditLog(sequelize)
};

// Associações entre modelos
// User-Expense
models.User.hasMany(models.Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});
models.Expense.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Income
models.User.hasMany(models.Income, {
  foreignKey: 'user_id',
  as: 'incomes'
});
models.Income.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Category
models.User.hasMany(models.Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
models.Category.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Budget
models.User.hasMany(models.Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
models.Budget.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-VerificationCode
models.User.hasMany(models.VerificationCode, {
  foreignKey: 'user_id',
  as: 'verificationCodes'
});
models.VerificationCode.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Category-Expense
models.Category.hasMany(models.Expense, {
  foreignKey: 'category_id',
  as: 'expenses'
});
models.Expense.belongsTo(models.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Income
models.Category.hasMany(models.Income, {
  foreignKey: 'category_id',
  as: 'incomes'
});
models.Income.belongsTo(models.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Budget
models.Category.hasMany(models.Budget, {
  foreignKey: 'category_id',
  as: 'budgets'
});
models.Budget.belongsTo(models.Category, {
  foreignKey: 'category_id',
  as: 'category'
});

// Bank-Expense
models.Bank.hasMany(models.Expense, {
  foreignKey: 'bank_id',
  as: 'expenses'
});
models.Expense.belongsTo(models.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// Bank-Income
models.Bank.hasMany(models.Income, {
  foreignKey: 'bank_id',
  as: 'incomes'
});
models.Income.belongsTo(models.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Bank (Many-to-Many)
models.User.belongsToMany(models.Bank, {
  through: models.UserBank,
  foreignKey: 'user_id',
  otherKey: 'bank_id',
  as: 'banks'
});
models.Bank.belongsToMany(models.User, {
  through: models.UserBank,
  foreignKey: 'bank_id',
  otherKey: 'user_id',
  as: 'users'
});

// Associações adicionais para UserBank
models.UserBank.belongsTo(models.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});
models.UserBank.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-RecurrenceRule
models.User.hasMany(models.RecurrenceRule, {
  foreignKey: 'user_id',
  as: 'recurrenceRules'
});
models.RecurrenceRule.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// RecurrenceRule-Category
models.Category.hasMany(models.RecurrenceRule, {
  foreignKey: 'category_id',
  as: 'recurrenceRules'
});
models.RecurrenceRule.belongsTo(models.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// RecurrenceRule-Bank
models.Bank.hasMany(models.RecurrenceRule, {
  foreignKey: 'bank_id',
  as: 'recurrenceRules'
});
models.RecurrenceRule.belongsTo(models.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Payment
models.User.hasMany(models.Payment, {
  foreignKey: 'user_id',
  as: 'payments'
});
models.Payment.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Expense-ExpensesRecurrenceException
models.Expense.hasMany(models.ExpensesRecurrenceException, {
  foreignKey: 'expense_id',
  as: 'exceptions'
});
models.ExpensesRecurrenceException.belongsTo(models.Expense, {
  foreignKey: 'expense_id',
  as: 'expense'
});

// User-ExpensesRecurrenceException
models.User.hasMany(models.ExpensesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'expenseExceptions'
});
models.ExpensesRecurrenceException.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Income-IncomesRecurrenceException
models.Income.hasMany(models.IncomesRecurrenceException, {
  foreignKey: 'income_id',
  as: 'exceptions'
});
models.IncomesRecurrenceException.belongsTo(models.Income, {
  foreignKey: 'income_id',
  as: 'income'
});

// User-IncomesRecurrenceException
models.User.hasMany(models.IncomesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'incomeExceptions'
});
models.IncomesRecurrenceException.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-FinancialGoal
models.User.hasOne(models.FinancialGoal, {
  foreignKey: 'user_id',
  as: 'financial_goal'
});
models.FinancialGoal.belongsTo(models.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Configurar associações
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize instance
export { models, sequelize };