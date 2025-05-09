// models/index.js
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

// Inicializar os modelos com o Sequelize
const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Bank = BankModel(sequelize);
const Expense = ExpenseModel(sequelize);
const Income = IncomeModel(sequelize);
const Budget = BudgetModel(sequelize);
const VerificationCode = VerificationCodeModel(sequelize);
const UserBank = UserBankModel(sequelize);
const RecurrenceRule = RecurrenceRuleModel(sequelize);
const ExpensesRecurrenceException = ExpensesRecurrenceExceptionModel(sequelize);
const IncomesRecurrenceException = IncomesRecurrenceExceptionModel(sequelize);
const Payment = PaymentModel(sequelize);
const FinancialGoal = FinancialGoalModel(sequelize);
const AuditLog = AuditLogModel(sequelize);

// Definição dos modelos em um objeto para facilitar associações
const models = {
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
};

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

// Configurar associações
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Exportar tudo
export { 
  models,
  sequelize,
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
};