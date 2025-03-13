import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Income = sequelize.define('Income', {
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isValidAmount(value) {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            throw new Error('O valor deve ser um número válido');
          }
          if (numValue < 0) {
            throw new Error('O valor não pode ser negativo');
          }
        }
      },
      get() {
        const value = this.getDataValue('amount');
        if (value === null || value === undefined) return 0;
        return Number(parseFloat(value).toFixed(2));
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue('amount', 0);
          return;
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          this.setDataValue('amount', 0);
          return;
        }
        this.setDataValue('amount', Number(numValue.toFixed(2)));
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    recurring_group_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'incomes'
  });

  return Income;
}; 