import { DataTypes } from 'sequelize';
import { encrypt, decrypt } from '../utils/encryption.js';

const Bank = (sequelize) => {
  const BankModel = sequelize.define('Bank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        const value = this.getDataValue('name');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('name', encrypt(value));
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        const value = this.getDataValue('code');
        return value ? decrypt(value) : null;
      },
      set(value) {
        this.setDataValue('code', encrypt(value));
      }
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      get() {
        const value = this.getDataValue('balance');
        return value === null ? 0 : Number(value);
      }
    }
  }, {
    timestamps: true,
    tableName: 'banks'
  });

  return BankModel;
};

export default Bank;