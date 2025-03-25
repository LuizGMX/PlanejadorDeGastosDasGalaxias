import { DataTypes } from 'sequelize';

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
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        is: /^\+?[1-9]\d{10,14}$/
      }
    },
    telegram_chat_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    telegram_username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
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
    financial_goal_date: {
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