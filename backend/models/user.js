const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    avatar: { type: DataTypes.ENUM('male', 'female'), allowNull: true },
    session_token: { type: DataTypes.STRING, allowNull: true },
  });
};
