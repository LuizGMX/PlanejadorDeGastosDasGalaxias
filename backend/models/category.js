import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    category_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'categories' // Adicionado para clareza
  });

  return Category;
};