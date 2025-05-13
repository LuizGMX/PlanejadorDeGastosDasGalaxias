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
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        isValidAmount(value) {
          if (typeof value !== 'string') {
            throw new Error('O valor deve ser uma string criptografada');
          }
        }
      },
      get() {
        const encryptedValue = this.getDataValue('amount');
        if (!encryptedValue) return null;
        // Add decryption logic here
        return encryptedValue;
      },
      set(value) {
        if (!value) {
          this.setDataValue('amount', null);
          return;
        }
        // Add encryption logic here
        this.setDataValue('amount', value);
      }
    },
    amount_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV usado para descriptografar o valor'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV usado para descriptografar a descrição'
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