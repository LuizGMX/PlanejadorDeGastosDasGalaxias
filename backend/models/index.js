// models/index.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import defineUserModel from './user.js';
import defineCategoryModel from './category.js';
import defineExpenseModel from './expense.js';
import defineIncomeModel from './income.js';
import defineBankModel from './bank.js';
import defineBudgetModel from './budget.js';
import defineVerificationCodeModel from './verificationCode.js';
import defineUserBankModel from './userBank.js';
import defineRecurrenceRuleModel from './recurrenceRule.js';
import defineRecurrenceExceptionModel from './recurrenceException.js';
import defineUserTelegramModel from './userTelegram.js';

// Configurações do banco de dados
dotenv.config();
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

// Definição dos modelos
const User = defineUserModel(sequelize);
const Category = defineCategoryModel(sequelize);
const Expense = defineExpenseModel(sequelize);
const Income = defineIncomeModel(sequelize);
const Bank = defineBankModel(sequelize);
const Budget = defineBudgetModel(sequelize);
const VerificationCode = defineVerificationCodeModel(sequelize);
const UserBank = defineUserBankModel(sequelize);
const RecurrenceRule = defineRecurrenceRuleModel(sequelize);
const RecurrenceException = defineRecurrenceExceptionModel(sequelize);
const UserTelegram = defineUserTelegramModel(sequelize);

// Associações entre modelos
// User-Expense
User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});
Expense.belongsTo(User, {
  foreignKey: 'user_id'
});

// User-Income
User.hasMany(Income, {
  foreignKey: 'user_id',
  as: 'incomes'
});
Income.belongsTo(User, {
  foreignKey: 'user_id'
});

// Expense-Category
Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Income-Category
Income.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Expense-Bank
Expense.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'Bank'
});

// Income-Bank
Income.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'Bank'
});

// User-Category
User.hasMany(Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
Category.belongsTo(User, {
  foreignKey: 'user_id'
});

// User-Bank
User.hasMany(Bank, {
  foreignKey: 'user_id',
  as: 'banks'
});
Bank.belongsTo(User, {
  foreignKey: 'user_id'
});

// User-Budget
User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
Budget.belongsTo(User, {
  foreignKey: 'user_id'
});

// User-VerificationCode
User.hasMany(VerificationCode, {
  foreignKey: 'user_id',
  as: 'verification_codes'
});
VerificationCode.belongsTo(User, {
  foreignKey: 'user_id'
});

// UserBank
User.hasMany(UserBank, {
  foreignKey: 'user_id',
  as: 'user_banks'
});
UserBank.belongsTo(User, {
  foreignKey: 'user_id'
});

Bank.hasMany(UserBank, {
  foreignKey: 'bank_id',
  as: 'user_banks'
});
UserBank.belongsTo(Bank, {
  foreignKey: 'bank_id'
});

// RecurrenceRule
User.hasMany(RecurrenceRule, {
  foreignKey: 'user_id',
  as: 'recurrence_rules'
});
RecurrenceRule.belongsTo(User, {
  foreignKey: 'user_id'
});

RecurrenceRule.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

RecurrenceRule.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'Bank'
});

// RecurrenceException
RecurrenceRule.hasMany(RecurrenceException, {
  foreignKey: 'recurrence_id',
  as: 'exceptions'
});
RecurrenceException.belongsTo(RecurrenceRule, {
  foreignKey: 'recurrence_id',
  as: 'rule'
});

// UserTelegram
User.hasOne(UserTelegram, {
  foreignKey: 'user_id',
  as: 'telegram'
});
UserTelegram.belongsTo(User, {
  foreignKey: 'user_id'
});

// Exports
export {
  sequelize,
  User,
  Category,
  Expense,
  Income,
  Bank,
  Budget,
  VerificationCode,
  UserBank,
  RecurrenceRule,
  RecurrenceException,
  UserTelegram
};