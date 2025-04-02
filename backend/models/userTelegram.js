import { DataTypes } from 'sequelize';

const UserTelegramModel = (sequelize) => {
  const UserTelegram = sequelize.define('UserTelegram', {
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
    telegram_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    chat_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verification_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verification_expires: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'user_telegram'
  });

  return UserTelegram;
};

export default UserTelegramModel; 