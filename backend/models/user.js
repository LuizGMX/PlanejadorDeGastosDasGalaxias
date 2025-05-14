import { DataTypes } from 'sequelize';
import { encrypt, decrypt } from '../utils/crypto.js';

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
        const encryptedValue = this.getDataValue('name');
        const iv = this.getDataValue('name_iv');
        if (!encryptedValue || !iv) return null;
        return decrypt(encryptedValue, iv);
      },
      set(value) {
        if (!value) {
          this.setDataValue('name', null);
          this.setDataValue('name_iv', null);
          return;
        }
        const { encrypted, iv } = encrypt(value);
        this.setDataValue('name', encrypted);
        this.setDataValue('name_iv', iv);
      }
    },
    name_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the name field'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      },
      get() {
        const encryptedValue = this.getDataValue('email');
        const iv = this.getDataValue('email_iv');
        if (!encryptedValue || !iv) return null;
        return decrypt(encryptedValue, iv);
      },
      set(value) {
        if (!value) {
          this.setDataValue('email', null);
          this.setDataValue('email_iv', null);
          return;
        }
        const { encrypted, iv } = encrypt(value);
        this.setDataValue('email', encrypted);
        this.setDataValue('email_iv', iv);
      }
    },
    email_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the email field'
    },
    telegram_chat_id: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const encryptedValue = this.getDataValue('telegram_chat_id');
        if (!encryptedValue) return null;
        return decrypt(encryptedValue);
      },
      set(value) {
        if (!value) {
          this.setDataValue('telegram_chat_id', null);
          return;
        }
        this.setDataValue('telegram_chat_id', encrypt(value));
      }
    },
    telegram_chat_id_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the telegram_chat_id field'
    },
    telegram_username: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const encryptedValue = this.getDataValue('telegram_username');
        if (!encryptedValue) return null;
        return decrypt(encryptedValue);
      },
      set(value) {
        if (!value) {
          this.setDataValue('telegram_username', null);
          return;
        }
        this.setDataValue('telegram_username', encrypt(value));
      }
    },
    telegram_username_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the telegram_username field'
    },
    telegram_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    financial_goal_name: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const encryptedValue = this.getDataValue('financial_goal_name');
        if (!encryptedValue) return null;
        return decrypt(encryptedValue);
      },
      set(value) {
        if (!value) {
          this.setDataValue('financial_goal_name', null);
          return;
        }
        this.setDataValue('financial_goal_name', encrypt(value));
      }
    },
    financial_goal_name_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the financial_goal_name field'
    },
    financial_goal_amount: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const encryptedValue = this.getDataValue('financial_goal_amount');
        const iv = this.getDataValue('financial_goal_amount_iv');
        if (!encryptedValue || !iv) return null;
        return decrypt(encryptedValue, iv);
      },
      set(value) {
        if (!value) {
          this.setDataValue('financial_goal_amount', null);
          this.setDataValue('financial_goal_amount_iv', null);
          return;
        }
        const { encrypted, iv } = encrypt(value.toString());
        this.setDataValue('financial_goal_amount', encrypted);
        this.setDataValue('financial_goal_amount_iv', iv);
      }
    },
    financial_goal_amount_iv: {
      type: DataTypes.STRING,
      allowNull: true,
      description: 'IV used for decrypting the financial_goal_amount field'
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
        const fieldsToEncrypt = [
          'email',
          'name',
          'telegram_chat_id',
          'telegram_username',
          'financial_goal_name',
          'financial_goal_amount',
          'financial_goal_period_type',
          'financial_goal_period_value',
          'financial_goal_start_date',
          'financial_goal_end_date',
          'desired_budget'
        ];
        fieldsToEncrypt.forEach((field) => {
          if (user.changed(field) && user[field]) {
            console.log(`Encrypting field: ${field}, Original value:`, user[field]);
            user[field] = encrypt(user[field].toString());
            console.log(`Encrypted value for field: ${field}:`, user[field]);
          }
        });
      }
    }
  });

  User.prototype.getDecryptedEmail = function () {
    return decrypt(this.email);
  };

  User.prototype.getDecryptedFields = function () {
    return {
      email: decrypt(this.email),
      name: decrypt(this.name),
      telegram_chat_id: this.telegram_chat_id ? decrypt(this.telegram_chat_id) : null,
      telegram_username: this.telegram_username ? decrypt(this.telegram_username) : null,
      financial_goal_name: this.financial_goal_name ? decrypt(this.financial_goal_name) : null,
    };
  };

  return User;
};