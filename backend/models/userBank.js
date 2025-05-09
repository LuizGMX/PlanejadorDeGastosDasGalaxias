import { DataTypes } from 'sequelize';
import { encryptFields } from '../middleware/cryptoMiddleware.js';

export default (sequelize) => {
  const UserBank = sequelize.define('UserBank', {
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
      }
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'banks',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    tableName: 'user_banks'
  });

  // Aplica criptografia aos campos sensíveis, se necessário
  encryptFields(['user_id'])(UserBank);
  
  return UserBank;
};