import { DataTypes } from 'sequelize';

// Bank Model
export default (sequelize) => {
  const Bank = sequelize.define('Bank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'banks'
  });

  return Bank;
};

// Category Model
const Category = (sequelize) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_name: { type: DataTypes.STRING, allowNull: false },
    is_favorite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  });
};

export default Category;

// Expense Model
export default (sequelize) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'subcategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'banks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    tableName: 'expenses'
  });

  return Expense;
};

// Index Model
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
Category.hasMany(SubCategory, { foreignKey: 'category_id' });
SubCategory.belongsTo(Category, { foreignKey: 'category_id' });

User.belongsToMany(Bank, { through: UserBank, foreignKey: 'user_id' });
Bank.belongsToMany(User, { through: UserBank, foreignKey: 'bank_id' });

// Associações do modelo Expense com nomes únicos para as chaves estrangeiras
Expense.belongsTo(User, {
  foreignKey: { name: 'expense_user_fk', allowNull: false },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Expense.belongsTo(Category, {
  foreignKey: { name: 'expense_category_fk', allowNull: false },
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});
Expense.belongsTo(SubCategory, {
  foreignKey: { name: 'expense_subcategory_fk', allowNull: false },
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});
Expense.belongsTo(Bank, {
  foreignKey: { name: 'expense_bank_fk', allowNull: false },
  onDelete: 'NO ACTION',
  onUpdate: 'CASCADE'
});

export default {
  sequelize,
  User,
  Category,
  Expense,
  VerificationCode,
  Bank,
  SubCategory,
  UserBank
};

// SubCategory Model
export default (sequelize) => {
  const SubCategory = sequelize.define('SubCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'subcategories'
  });

  return SubCategory;
};

// User Model
export default (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    net_income: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'users'
  });

  return User;
};

// UserBank Model
export default (sequelize) => {
  const UserBank = sequelize.define('UserBank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'user_banks'
  });

  return UserBank;
};

// VerificationCode Model
import { DataTypes } from 'sequelize';

const VerificationCode = (sequelize) => {
  return sequelize.define('VerificationCode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING(6), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });
};

export default VerificationCode;
