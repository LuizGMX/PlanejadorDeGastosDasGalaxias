import { DataTypes } from 'sequelize';

const ExpensesRecurrenceExceptionModel = (sequelize) => {
  const ExpensesRecurrenceException = sequelize.define('ExpensesRecurrenceException', {
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
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    expense_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id'
      }
    },
    exception_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    exception_type: {
      type: DataTypes.ENUM('SKIP', 'MODIFY', 'ADD'),
      allowNull: false,
      defaultValue: 'SKIP'
    },
    modified_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    modified_description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'expenses_recurrence_exceptions',
    timestamps: true
  });

  return ExpensesRecurrenceException;
};

export default ExpensesRecurrenceExceptionModel; 