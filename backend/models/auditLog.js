import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    tableName: 'audit_logs',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['timestamp']
      }
    ]
  });

  return AuditLog;
}; 