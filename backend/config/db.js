import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Create a new Sequelize instance to connect to the local database
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
      max: 20,              // Aumentado para 20 conexões máximas
      min: 5,               // Mínimo de 5 conexões mantidas
      acquire: 60000,       // 60 segundos para adquirir conexão
      idle: 10000,          // 10 segundos antes de liberar conexão ociosa
      evict: 30000,         // Verifica conexões a cada 30 segundos
      handleDisconnects: true // Lidar com desconexões automaticamente
    },
    dialectOptions: {
      connectTimeout: 60000,  // 60 segundos para timeout de conexão
      options: {
        requestTimeout: 60000 // 60 segundos para timeout de requisição
      },
      // Configurações adicionais de resiliência
      maxReconnects: 5,
      reconnectInterval: 2000, // 2 segundos entre tentativas
      keepDefaultTimezone: true,
      decimalNumbers: true,
      supportBigNumbers: true
    },
    retry: {
      max: 5,              // Tentar reconectar até 5 vezes
      match: [            // Tipos de erros que devem acionar reconexão
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeAccessDeniedError/,
        /Connection acquired/,
        /socket hang up/,
        /PROTOCOL_CONNECTION_LOST/
      ],
      backoffBase: 1000,   // Espera inicial de 1 segundo
      backoffExponent: 1.5 // Aumenta o tempo de espera exponencialmente
    }
  }
);

// Adicionar listeners para monitorar a conexão
sequelize
  .authenticate()
  .then(() => {
    console.log('👍 Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch(err => {
    console.error('❌ Erro ao conectar com o banco de dados:', err);
  });

// Remover os eventos incompatíveis com a versão atual do Sequelize
// Implementar monitoramento de conexão de forma alternativa
const monitorDatabaseConnection = () => {
  let lastConnectionStatus = true;
  
  // Configurar ping periódico para manter a conexão ativa e monitorar status
  setInterval(async () => {
    try {
      await sequelize.query('SELECT 1+1 AS result');
      // Se estava desconectado e agora está conectado
      if (!lastConnectionStatus) {
        console.log('🔄 Reconectado ao banco de dados com sucesso.');
        lastConnectionStatus = true;
      }
    } catch (error) {
      // Se estava conectado e agora está desconectado
      if (lastConnectionStatus) {
        console.error('🔌 Conexão com o banco de dados perdida:', error.message);
        lastConnectionStatus = false;
      }
    }
  }, 30000); // A cada 30 segundos
};

// Iniciar monitoramento de conexão
monitorDatabaseConnection();

// Redirecionamento para a instância compartilhada de Sequelize
import db, { sequelize, models } from '../models/index.js';

// Função para sincronizar o banco de dados usando a instância compartilhada
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

// Re-exportar sequelize para compatibilidade
export default sequelize;