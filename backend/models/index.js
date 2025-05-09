// models/index.js - Uma abordagem mais tradicional e direta
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Carregar variáveis de ambiente
dotenv.config();

// Criar instância do Sequelize diretamente aqui
const dbSequelize = new Sequelize(
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
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    }
  }
);

// Objeto que vai armazenar todos os modelos
const db = {};

// Importar todos os modelos dinamicamente
fs.readdirSync(__dirname)
  .filter(file => 
    file.indexOf('.') !== 0 && 
    file !== 'index.js' && 
    file.slice(-3) === '.js'
  )
  .forEach(file => {
    // Usar require.default ou import dinâmico não funcionaria
    // Então, vamos importar os principais modelos manualmente
  });

// Importações manuais
import UserModel from './user.js';
import CategoryModel from './category.js';
import BankModel from './bank.js';
import ExpenseModel from './expense.js';
import IncomeModel from './income.js';
import BudgetModel from './budget.js';
import VerificationCodeModel from './verificationCode.js';
import UserBankModel from './userBank.js';
import RecurrenceRuleModel from './recurrenceRule.js';
import ExpensesRecurrenceExceptionModel from './expensesRecurrenceException.js';
import IncomesRecurrenceExceptionModel from './incomesRecurrenceException.js';
import PaymentModel from './payment.js';
import FinancialGoalModel from './financialGoal.js';
import AuditLogModel from './auditLog.js';

// Inicializar modelos manualmente
db.User = UserModel(dbSequelize);
db.Category = CategoryModel(dbSequelize);
db.Bank = BankModel(dbSequelize);
db.Expense = ExpenseModel(dbSequelize);
db.Income = IncomeModel(dbSequelize);
db.Budget = BudgetModel(dbSequelize);
db.VerificationCode = VerificationCodeModel(dbSequelize);
db.UserBank = UserBankModel(dbSequelize);
db.RecurrenceRule = RecurrenceRuleModel(dbSequelize);
db.ExpensesRecurrenceException = ExpensesRecurrenceExceptionModel(dbSequelize);
db.IncomesRecurrenceException = IncomesRecurrenceExceptionModel(dbSequelize);
db.Payment = PaymentModel(dbSequelize);
db.FinancialGoal = FinancialGoalModel(dbSequelize);
db.AuditLog = AuditLogModel(dbSequelize);

// Realizar as associações
// User-Expense
db.User.hasMany(db.Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});
db.Expense.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Income
db.User.hasMany(db.Income, {
  foreignKey: 'user_id',
  as: 'incomes'
});
db.Income.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Category
db.User.hasMany(db.Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
db.Category.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Budget
db.User.hasMany(db.Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
db.Budget.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-VerificationCode
db.User.hasMany(db.VerificationCode, {
  foreignKey: 'user_id',
  as: 'verificationCodes'
});
db.VerificationCode.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Category-Expense
db.Category.hasMany(db.Expense, {
  foreignKey: 'category_id',
  as: 'expenses'
});
db.Expense.belongsTo(db.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Income
db.Category.hasMany(db.Income, {
  foreignKey: 'category_id',
  as: 'incomes'
});
db.Income.belongsTo(db.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Budget
db.Category.hasMany(db.Budget, {
  foreignKey: 'category_id',
  as: 'budgets'
});
db.Budget.belongsTo(db.Category, {
  foreignKey: 'category_id',
  as: 'category'
});

// Bank-Expense
db.Bank.hasMany(db.Expense, {
  foreignKey: 'bank_id',
  as: 'expenses'
});
db.Expense.belongsTo(db.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// Bank-Income
db.Bank.hasMany(db.Income, {
  foreignKey: 'bank_id',
  as: 'incomes'
});
db.Income.belongsTo(db.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Bank (Many-to-Many)
db.User.belongsToMany(db.Bank, {
  through: db.UserBank,
  foreignKey: 'user_id',
  otherKey: 'bank_id',
  as: 'banks'
});
db.Bank.belongsToMany(db.User, {
  through: db.UserBank,
  foreignKey: 'bank_id',
  otherKey: 'user_id',
  as: 'users'
});

// Associações adicionais para UserBank
db.UserBank.belongsTo(db.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});
db.UserBank.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-RecurrenceRule
db.User.hasMany(db.RecurrenceRule, {
  foreignKey: 'user_id',
  as: 'recurrenceRules'
});
db.RecurrenceRule.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// RecurrenceRule-Category
db.Category.hasMany(db.RecurrenceRule, {
  foreignKey: 'category_id',
  as: 'recurrenceRules'
});
db.RecurrenceRule.belongsTo(db.Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// RecurrenceRule-Bank
db.Bank.hasMany(db.RecurrenceRule, {
  foreignKey: 'bank_id',
  as: 'recurrenceRules'
});
db.RecurrenceRule.belongsTo(db.Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Payment
db.User.hasMany(db.Payment, {
  foreignKey: 'user_id',
  as: 'payments'
});
db.Payment.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Expense-ExpensesRecurrenceException
db.Expense.hasMany(db.ExpensesRecurrenceException, {
  foreignKey: 'expense_id',
  as: 'exceptions'
});
db.ExpensesRecurrenceException.belongsTo(db.Expense, {
  foreignKey: 'expense_id',
  as: 'expense'
});

// User-ExpensesRecurrenceException
db.User.hasMany(db.ExpensesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'expenseExceptions'
});
db.ExpensesRecurrenceException.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Income-IncomesRecurrenceException
db.Income.hasMany(db.IncomesRecurrenceException, {
  foreignKey: 'income_id',
  as: 'exceptions'
});
db.IncomesRecurrenceException.belongsTo(db.Income, {
  foreignKey: 'income_id',
  as: 'income'
});

// User-IncomesRecurrenceException
db.User.hasMany(db.IncomesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'incomeExceptions'
});
db.IncomesRecurrenceException.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-FinancialGoal
db.User.hasOne(db.FinancialGoal, {
  foreignKey: 'user_id',
  as: 'financial_goal'
});
db.FinancialGoal.belongsTo(db.User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Adicionar o Sequelize ao objeto db
db.sequelize = dbSequelize;
db.Sequelize = Sequelize;

// Exportar como default e também nomear exports
export default db;
export const models = db;
export const { 
  User, 
  Category, 
  Bank, 
  Expense, 
  Income, 
  Budget, 
  VerificationCode, 
  UserBank, 
  RecurrenceRule, 
  ExpensesRecurrenceException, 
  IncomesRecurrenceException, 
  Payment, 
  FinancialGoal, 
  AuditLog 
} = db;
export const sequelize = dbSequelize;