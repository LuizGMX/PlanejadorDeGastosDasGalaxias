import { DataTypes } from 'sequelize';

const TelegramVerificationCode = (sequelize) => {
  const model = sequelize.define('telegram_verification_codes', {
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
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true
  });

  return model;
};

export default TelegramVerificationCode; 