import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('pgg_db', 'root', 'root', {
  host: '172.18.0.2',
  dialect: 'mysql',
  port: 3306,
  logging: false
});

export default sequelize; 