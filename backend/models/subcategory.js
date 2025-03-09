import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SubCategory = sequelize.define('SubCategory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'subcategories'
  });

  return SubCategory;
};