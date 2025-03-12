// models/index.js
import sequelize from '../config/db.js';
import UserModel from './user.js';
import CategoryModel from './category.js';
import ExpenseModel from './expense.js';
import IncomeModel from './income.js';
import VerificationCodeModel from './verificationCode.js';
import BankModel from './bank.js';
import SubCategoryModel from './subcategory.js';
import BudgetModel from './budget.js';

// Inicialização dos modelos
const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Expense = ExpenseModel(sequelize);
const Income = IncomeModel(sequelize);
const VerificationCode = VerificationCodeModel(sequelize);
const Bank = BankModel(sequelize);
const SubCategory = SubCategoryModel(sequelize);
const Budget = BudgetModel(sequelize);

// Relacionamentos
Expense.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Income.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Income.belongsTo(Category, {
  foreignKey: 'category_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Expense.belongsTo(SubCategory, {
  foreignKey: 'subcategory_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Income.belongsTo(SubCategory, {
  foreignKey: 'subcategory_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Expense.belongsTo(Bank, {
  foreignKey: 'bank_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

Income.belongsTo(Bank, {
  foreignKey: 'bank_id',
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

// Relacionamento entre Category e SubCategory
Category.hasMany(SubCategory, {
  foreignKey: 'category_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

SubCategory.belongsTo(Category, {
  foreignKey: 'category_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Relacionamento do Budget com User
Budget.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Exportação dos modelos
export {
  User,
  Category,
  SubCategory,
  Expense,
  Income,
  Bank,
  Budget,
  VerificationCode
};

// Exportação padrão
export default {
  sequelize,
  User,
  Category,
  Expense,
  Income,
  Bank,
  SubCategory,
  Budget,
  VerificationCode
};