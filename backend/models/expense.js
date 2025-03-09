import { DataTypes } from 'sequelize';

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
      allowNull: false, // Mantido como NOT NULL
      references: {
        model: 'categories',
        key: 'id',
        name: 'fk_expense_category'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION' // Alterado de 'SET NULL'
    },
    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Mantido como NOT NULL
      references: {
        model: 'subcategories',
        key: 'id',
        name: 'fk_expense_subcategory'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION' // Alterado de 'SET NULL'
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // Mantido como NOT NULL
      references: {
        model: 'banks',
        key: 'id',
        name: 'fk_expense_bank'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION' // Alterado de 'SET NULL'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
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