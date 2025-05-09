// models/index.js - Definição e associação dos modelos
import sequelize from '../config/db.js';
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

// Objeto para armazenar todos os modelos
const db = {};

// Inicializar modelos
db.User = UserModel(sequelize);
db.Category = CategoryModel(sequelize);
db.Bank = BankModel(sequelize);
db.Expense = ExpenseModel(sequelize);
db.Income = IncomeModel(sequelize);
db.Budget = BudgetModel(sequelize);
db.VerificationCode = VerificationCodeModel(sequelize);
db.UserBank = UserBankModel(sequelize);
db.RecurrenceRule = RecurrenceRuleModel(sequelize);
db.ExpensesRecurrenceException = ExpensesRecurrenceExceptionModel(sequelize);
db.IncomesRecurrenceException = IncomesRecurrenceExceptionModel(sequelize);
db.Payment = PaymentModel(sequelize);
db.FinancialGoal = FinancialGoalModel(sequelize);
db.AuditLog = AuditLogModel(sequelize);

// Guardar a instância do Sequelize no objeto db
db.sequelize = sequelize;

// Configurar as associações entre os modelos
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

// Exportações
export default db;
export const models = db;
export { sequelize }; // Exportar o sequelize diretamente
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