const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('VerificationCode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING(6), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  });
};
