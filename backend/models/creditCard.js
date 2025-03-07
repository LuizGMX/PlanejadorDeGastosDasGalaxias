const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('CreditCard', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    card_name: { type: DataTypes.STRING, allowNull: false },
  });
};
