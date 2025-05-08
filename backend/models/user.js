import { DataTypes } from 'sequelize';
import { encrypt, decrypt } from '../utils/encryption.js';

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
      },
      get() {
        const value = this.getDataValue('name');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('name', encrypt(value));
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      },
      get() {
        const value = this.getDataValue('email');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('email', encrypt(value));
      }
    },
    telegram_chat_id: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('telegram_chat_id');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('telegram_chat_id', encrypt(value));
      }
    },
    telegram_username: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('telegram_username');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('telegram_username', encrypt(value));
      }
    },
    telegram_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    financial_goal_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    financial_goal_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      get() {
        const value = this.getDataValue('financial_goal_amount');
        return value === null ? 0 : Number(value);
      }
    },
    financial_goal_period_type: {
      type: DataTypes.ENUM('days', 'months', 'years'),
      allowNull: true
    },
    financial_goal_period_value: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    financial_goal_start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    financial_goal_end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    financial_goal_created_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    desired_budget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const value = this.getDataValue('desired_budget');
        return value === null ? 0 : Number(value);
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
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ],
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('financial_goal_amount') && user.financial_goal_amount && !user.financial_goal_created_at) {
          user.financial_goal_created_at = new Date();
        }
      }
    }
  });

  return User;
};