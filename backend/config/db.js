import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();
console.log("AQUI " + process.env.DB_NAME);
// Create a new Sequelize instance to connect to the local database
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

export default sequelize;