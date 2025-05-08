import { DataTypes } from 'sequelize';
import { encrypt, decrypt } from '../utils/encryption.js';

export default (sequelize) => {
  const Income = sequelize.define('Income', {
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
        return Number(parseFloat(decryptedValue).toFixed(2));
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
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      get() {
        const value = this.getDataValue('date');
        if (!value) return null;
        
        // Verifica se o usuário está autenticado e se é o dono do registro
        if (!this.context?.user?.id) {
          return null;
        }
        
        return decrypt(value);
      },
      set(value) {
        this.setDataValue('date', encrypt(value));
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
    recurring_group_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    }
  }, {
    timestamps: true,
    tableName: 'incomes'
  });

  return Income;
}; 