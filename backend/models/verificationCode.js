import { DataTypes } from 'sequelize';
import { encryptFields } from '../middleware/cryptoMiddleware.js';

export default (sequelize) => {
  const VerificationCode = sequelize.define('VerificationCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
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
    tableName: 'verification_codes'
  });
  
  // Aplica criptografia aos campos sensíveis
  // Como não temos um userId associado diretamente, usamos o 'id' do próprio registro
  encryptFields(['email', 'code', 'user_data'])(VerificationCode);

  return VerificationCode;
};