const defineFinancialGoalModel = (sequelize) => {
  const FinancialGoal = sequelize.define('FinancialGoal', {
    id: {
      type: sequelize.Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    name: {
      type: sequelize.Sequelize.STRING,
      allowNull: false
    },
    amount: {
      type: sequelize.Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    period_type: {
      type: sequelize.Sequelize.ENUM('days', 'months', 'years'),
      allowNull: false
    },
    period_value: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false
    },
    start_date: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.NOW
    },
    end_date: {
      type: sequelize.Sequelize.DATE,
      allowNull: false
    }
  }, {
    tableName: 'financial_goals',
    timestamps: true
  });

  return FinancialGoal;
};

export default defineFinancialGoalModel; 