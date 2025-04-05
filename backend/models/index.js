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

// User-Category
User.hasMany(Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
Category.belongsTo(User, {
  foreignKey: 'user_id'
});

// Category-Expense
Category.hasMany(Expense, {
  foreignKey: 'category_id',
  as: 'expenses'
});
Expense.belongsTo(Category, {
  foreignKey: 'category_id'
});

// Category-Income
Category.hasMany(Income, {
  foreignKey: 'category_id',
  as: 'incomes'
});
Income.belongsTo(Category, {
  foreignKey: 'category_id'
});

// Bank-Expense
Bank.hasMany(Expense, {
  foreignKey: 'bank_id',
  as: 'expenses'
});
Expense.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// Bank-Income
Bank.hasMany(Income, {
  foreignKey: 'bank_id',
  as: 'incomes'
});
Income.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Budget
User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
Budget.belongsTo(User, {
  foreignKey: 'user_id'
});

// Category-Budget
Category.hasMany(Budget, {
  foreignKey: 'category_id',
  as: 'budgets'
});
Budget.belongsTo(Category, {
  foreignKey: 'category_id'
});

// User-Bank (através de UserBank)
User.belongsToMany(Bank, {
  through: UserBank,
  foreignKey: 'user_id',
  otherKey: 'bank_id',
  as: 'banks'
});
Bank.belongsToMany(User, {
  through: UserBank,
  foreignKey: 'bank_id',
  otherKey: 'user_id',
  as: 'users'
});

// UserBank-User
UserBank.belongsTo(User, {
  foreignKey: 'user_id'
});
User.hasMany(UserBank, {
  foreignKey: 'user_id',
  as: 'user_banks'
});

// UserBank-Bank
UserBank.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});
Bank.hasMany(UserBank, {
  foreignKey: 'bank_id',
  as: 'user_banks'
});

// RecurrenceRule-Expense
RecurrenceRule.hasMany(Expense, {
  foreignKey: 'recurrence_id',
  as: 'expenses'
});
Expense.belongsTo(RecurrenceRule, {
  foreignKey: 'recurrence_id',
  as: 'recurrence'
});

// RecurrenceRule-RecurrenceException
RecurrenceRule.hasMany(RecurrenceException, {
  foreignKey: 'recurrence_id',
  as: 'exceptions'
});
RecurrenceException.belongsTo(RecurrenceRule, {
  foreignKey: 'recurrence_id',
  as: 'RecurrenceRule'
});

// RecurrenceRule associations
RecurrenceRule.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});
RecurrenceRule.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
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
  RecurrenceException
};