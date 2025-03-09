// models/index.js
import sequelize from '../config/db.js';
import UserModel from './user.js';
import CategoryModel from './category.js';
import ExpenseModel from './expense.js';
import VerificationCodeModel from './verificationCode.js';
import BankModel from './bank.js';
import SubCategoryModel from './subcategory.js';
import UserBankModel from './userBank.js';

export const User = UserModel(sequelize);
export const Category = CategoryModel(sequelize);
export const Expense = ExpenseModel(sequelize);
export const VerificationCode = VerificationCodeModel(sequelize);
export const Bank = BankModel(sequelize);
export const SubCategory = SubCategoryModel(sequelize);
export const UserBank = UserBankModel(sequelize);

// Relacionamentos
Expense.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  onDelete: 'NO ACTION', // Alterado de 'SET NULL'
  onUpdate: 'CASCADE'
});
Expense.belongsTo(SubCategory, {
  foreignKey: 'subcategory_id',
  onDelete: 'NO ACTION', // Alterado de 'SET NULL'
  onUpdate: 'CASCADE'
});
Expense.belongsTo(Bank, {
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

// User.belongsToMany(Bank, { through: UserBank, foreignKey: 'user_id' });
// Bank.belongsToMany(User, { through: UserBank, foreignKey: 'bank_id' });

export default {
  sequelize,
  User,
  Category,
  Expense,
  Bank,
  SubCategory
};