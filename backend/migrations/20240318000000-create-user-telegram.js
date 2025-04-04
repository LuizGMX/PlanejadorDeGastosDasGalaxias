import { DataTypes } from 'sequelize';

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_telegram', {
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
        allowNull: true,
        unique: true,
        defaultValue: null
      },
      chat_id: {
        type: DataTypes.STRING,
        allowNull: true
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
        type: DataTypes.STRING(6),
        allowNull: true,
        validate: {
          is: /^\d{6}$/
        }
      },
      verification_expires: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Adiciona índices
    await queryInterface.addIndex('user_telegram', ['user_id']);
    await queryInterface.addIndex('user_telegram', ['verification_code']);
    await queryInterface.addIndex('user_telegram', ['telegram_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_telegram');
  }
}; 