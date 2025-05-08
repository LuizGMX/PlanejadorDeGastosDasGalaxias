import { DataTypes } from 'sequelize';
import { encrypt, decrypt } from '../utils/encryption';

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
      onDelete: 'CASCADE',
      get() {
        const value = this.getDataValue('user_id');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (this.context?.user?.id !== decrypt(value)) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('user_id', encrypt(value));
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION',
      get() {
        const value = this.getDataValue('category_id');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('category_id', encrypt(value));
      }
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'banks',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'NO ACTION',
      get() {
        const value = this.getDataValue('bank_id');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('bank_id', encrypt(value));
      }
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
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return 0;
        }
        
        const decryptedValue = decrypt(value);
        return Number(Number(decryptedValue).toFixed(2));
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('amount', encrypt('0'));
          return;
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          this.setDataValue('amount', encrypt('0'));
          return;
        }
        this.setDataValue('amount', encrypt(numValue.toFixed(2)));
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        const value = this.getDataValue('description');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('description', encrypt(value));
      }
    },
    expense_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      get() {
        const value = this.getDataValue('expense_date');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('expense_date', encrypt(value));
      }
    },
    payment_method: {
      type: DataTypes.ENUM('credit_card', 'debit_card', 'pix', 'money', 'cash'),
      allowNull: false,
      defaultValue: 'credit_card',
      get() {
        const value = this.getDataValue('payment_method');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('payment_method', encrypt(value));
      }
    },
    is_in_cash: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      get() {
        const value = this.getDataValue('is_in_cash');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('is_in_cash', encrypt(value));
      }
    },
    has_installments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      get() {
        const value = this.getDataValue('has_installments');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('has_installments', encrypt(value));
      }
    },
    current_installment: {
      type: DataTypes.INTEGER,
      allowNull: true,
      get() {
        const value = this.getDataValue('current_installment');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('current_installment', encrypt(value));
      }
    },
    total_installments: {
      type: DataTypes.INTEGER,
      allowNull: true,
      get() {
        const value = this.getDataValue('total_installments');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('total_installments', encrypt(value));
      }
    },
    installment_group_id: {
      type: DataTypes.UUID,
      allowNull: true,
      description: 'ID para agrupar despesas parceladas',
      get() {
        const value = this.getDataValue('installment_group_id');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('installment_group_id', encrypt(value));
      }
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      get() {
        const value = this.getDataValue('is_recurring');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('is_recurring', encrypt(value));
      }
    },
    recurrence_type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'),
      allowNull: true,
      get() {
        const value = this.getDataValue('recurrence_type');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('recurrence_type', encrypt(value));
      }
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        const value = this.getDataValue('end_date');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('end_date', encrypt(value));
      }
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
      get() {
        const value = this.getDataValue('start_date');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('start_date', encrypt(value));
      }
    },
    recurring_group_id: {
      type: DataTypes.UUID,
      allowNull: true,
      description: 'ID para agrupar despesas recorrentes',
      get() {
        const value = this.getDataValue('recurring_group_id');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('recurring_group_id', encrypt(value));
      }
    }
  }, {
    timestamps: true,
    tableName: 'expenses'
  });

  return Expense;
};