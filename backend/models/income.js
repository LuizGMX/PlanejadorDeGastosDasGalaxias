import { DataTypes } from 'sequelize';

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
      onDelete: 'CASCADE'
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
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
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
    recurring_group_id: {
      type: DataTypes.UUID,
      allowNull: true
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
    }
  }, {
    timestamps: true,
    tableName: 'incomes'
  });

  return Income;
};