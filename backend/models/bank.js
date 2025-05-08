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
        if (!value) return null;
        
        try {
          return decrypt(value);
        } catch (error) {
          console.error('Erro ao descriptografar nome do banco:', error);
          return value;
        }
      },
      set(value) {
        if (!value) {
          this.setDataValue('name', null);
          return;
        }
        
        try {
          this.setDataValue('name', encrypt(value));
        } catch (error) {
          console.error('Erro ao criptografar nome do banco:', error);
          this.setDataValue('name', value);
        }
      }
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        const value = this.getDataValue('code');
        if (!value) return null;
        
        try {
          return decrypt(value);
        } catch (error) {
          console.error('Erro ao descriptografar código do banco:', error);
          return value;
        }
      },
      set(value) {
        if (!value) {
          this.setDataValue('code', null);
          return;
        }
        
        try {
          this.setDataValue('code', encrypt(value));
        } catch (error) {
          console.error('Erro ao criptografar código do banco:', error);
          this.setDataValue('code', value);
        }
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