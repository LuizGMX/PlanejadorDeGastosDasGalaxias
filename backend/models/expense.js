const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    credit_card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING, // 'card' ou 'pix'
      allowNull: false,
    },
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    total_installments: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expense_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'Expenses',
    timestamps: true,
  });

  return Expense;
};