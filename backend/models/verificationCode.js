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
      type: DataTypes.STRING(6),
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
        date.setMinutes(date.getMinutes() + 10); // Expira em 10 minutos
        return date;
      }
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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