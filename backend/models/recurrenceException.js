import { DataTypes } from 'sequelize';

const RecurrenceExceptionModel = (sequelize) => {
  const RecurrenceException = sequelize.define('RecurrenceException', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    exception_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    exception_type: {
      type: DataTypes.ENUM('SKIP', 'MODIFY', 'ADD'),
      allowNull: false
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
    tableName: 'recurrence_exceptions',
    timestamps: true
  });

  return RecurrenceException;
};

export default RecurrenceExceptionModel; 