import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Criar instância do Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    },
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    }
  }
);

// Monitoramento da conexão
sequelize
  .authenticate()
  .then(() => {
    console.log('👍 Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
  });

// Função para sincronizar o banco de dados
export const syncDatabase = async () => {
  try {
    // Sincronizar banco de dados
    await sequelize.sync({ force: false });
    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar o banco de dados:', error);
    console.error('Detalhes do erro:', error.original || error);
    console.error('Conexão com host:', process.env.DB_HOST || 'localhost');
    throw error;
  }
};

// Função para testar a conexão
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    console.error('Detalhes do erro:', error.original || error);
    console.error('Conexão com host:', process.env.DB_HOST || 'localhost');
    console.error('Nome do banco:', process.env.DB_NAME || 'planejador');
    console.error('Usuário:', process.env.DB_USER || 'root');
    throw error;
  }
};

export default sequelize;