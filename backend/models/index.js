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
import defineExpensesRecurrenceExceptionModel from './expensesRecurrenceException.js';
import defineIncomesRecurrenceExceptionModel from './incomesRecurrenceException.js';
import definePaymentModel from './payment.js';
import defineFinancialGoalModel from './financialGoal.js';

// Configurações do banco de dados
dotenv.config();
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
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
const ExpensesRecurrenceException = defineExpensesRecurrenceExceptionModel(sequelize);
const IncomesRecurrenceException = defineIncomesRecurrenceExceptionModel(sequelize);
const Payment = definePaymentModel(sequelize);
const FinancialGoal = defineFinancialGoalModel(sequelize);

// Associações entre modelos
// User-Expense
User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});
Expense.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Income
User.hasMany(Income, {
  foreignKey: 'user_id',
  as: 'incomes'
});
Income.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Category
User.hasMany(Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
Category.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Budget
User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
Budget.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-VerificationCode
User.hasMany(VerificationCode, {
  foreignKey: 'user_id',
  as: 'verificationCodes'
});
VerificationCode.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Category-Expense
Category.hasMany(Expense, {
  foreignKey: 'category_id',
  as: 'expenses'
});
Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Income
Category.hasMany(Income, {
  foreignKey: 'category_id',
  as: 'incomes'
});
Income.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Budget
Category.hasMany(Budget, {
  foreignKey: 'category_id',
  as: 'budgets'
});
Budget.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
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

// User-Bank (Many-to-Many)
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

// Associações adicionais para UserBank
UserBank.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});
UserBank.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-RecurrenceRule
User.hasMany(RecurrenceRule, {
  foreignKey: 'user_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// RecurrenceRule-Category
Category.hasMany(RecurrenceRule, {
  foreignKey: 'category_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// RecurrenceRule-Bank
Bank.hasMany(RecurrenceRule, {
  foreignKey: 'bank_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Payment
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments'
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Expense-ExpensesRecurrenceException
Expense.hasMany(ExpensesRecurrenceException, {
  foreignKey: 'expense_id',
  as: 'exceptions'
});
ExpensesRecurrenceException.belongsTo(Expense, {
  foreignKey: 'expense_id',
  as: 'expense'
});

// User-ExpensesRecurrenceException
User.hasMany(ExpensesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'expenseExceptions'
});
ExpensesRecurrenceException.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Income-IncomesRecurrenceException
Income.hasMany(IncomesRecurrenceException, {
  foreignKey: 'income_id',
  as: 'exceptions'
});
IncomesRecurrenceException.belongsTo(Income, {
  foreignKey: 'income_id',
  as: 'income'
});

// User-IncomesRecurrenceException
User.hasMany(IncomesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'incomeExceptions'
});
IncomesRecurrenceException.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-FinancialGoal
User.hasOne(FinancialGoal, {
  foreignKey: 'user_id',
  as: 'financial_goal'
});
FinancialGoal.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Exporta os modelos e a instância do Sequelize
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
  ExpensesRecurrenceException,
  IncomesRecurrenceException,
  Payment,
  FinancialGoal
};