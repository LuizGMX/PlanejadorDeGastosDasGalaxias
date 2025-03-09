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
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    },
    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'subcategories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'banks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION'
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
    expense_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    payment_method: {
      type: DataTypes.ENUM('pix', 'card'),
      allowNull: false,
      defaultValue: 'card'
    },
    has_installments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    current_installment: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    total_installments: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    installment_group_id: {
      type: DataTypes.UUID,
      allowNull: true,
      description: 'ID para agrupar despesas parceladas'
    }
  }, {
    timestamps: true,
    tableName: 'expenses'
  });

  return Expense;
};