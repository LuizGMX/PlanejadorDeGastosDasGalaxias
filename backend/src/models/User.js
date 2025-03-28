const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  financial_goal_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  financial_goal_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  financial_goal_start_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  financial_goal_end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  telegram_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
}); 