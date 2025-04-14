import { DataTypes } from 'sequelize';

const IncomesRecurrenceExceptionModel = (sequelize) => {
  const IncomesRecurrenceException = sequelize.define('IncomesRecurrenceException', {
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
    income_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'incomes',
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
    tableName: 'incomes_recurrence_exceptions',
    timestamps: true
  });

  return IncomesRecurrenceException;
};

export default IncomesRecurrenceExceptionModel; 