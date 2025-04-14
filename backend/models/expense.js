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
        min: 0,
        isValidAmount(value) {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            throw new Error('O valor deve ser um número válido');
          }
          if (numValue < 0) {
            throw new Error('O valor não pode ser negativo');
          }
        }
      },
      get() {
        const value = this.getDataValue('amount');
        if (value === null || value === undefined) return 0;
        return Number(Number(value).toFixed(2));
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('amount', 0);
          return;
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          this.setDataValue('amount', 0);
          return;
        }
        this.setDataValue('amount', Number(numValue.toFixed(2)));
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
      type: DataTypes.ENUM('credit_card', 'debit_card', 'pix', 'money', 'cash'),
      allowNull: false,
      defaultValue: 'credit_card'
    },
    is_in_cash: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recurrence_type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'),
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recurring_group_id: {
      type: DataTypes.UUID,
      allowNull: true,
      description: 'ID para agrupar despesas recorrentes'
    }
  }, {
    timestamps: true,
    tableName: 'expenses'
  });

  return Expense;
};