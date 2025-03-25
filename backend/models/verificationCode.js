import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const VerificationCode = sequelize.define('VerificationCode', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 15); // Expira em 15 minutos
        return date;
      }
    }
  }, {
    tableName: 'verification_codes',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email', 'code']
      }
    ]
  });

  return VerificationCode;
};