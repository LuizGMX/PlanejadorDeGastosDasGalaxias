import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Bank = sequelize.define('Bank', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
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

  return Bank;
};