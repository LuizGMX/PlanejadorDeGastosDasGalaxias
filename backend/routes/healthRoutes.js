import express from 'express';
import os from 'os';
import { sequelize } from '../models/index.js';
import seedDatabase from '../database/seeds/index.js';

const router = express.Router();

// Endpoint simples para verificar se a API está funcionando
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    server: 'API Planejador de Gastos das Galáxias'
  });
});

// Endpoint para verificar informações mais detalhadas de sistema
router.get('/details', (req, res) => {
  const details = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    hostname: os.hostname(),
    node_version: process.version,
    db_host: process.env.DB_HOST || 'localhost',
    db_name: process.env.DB_NAME || 'planejador',
    db_user: process.env.DB_USER || 'root',
    api_prefix: process.env.API_PREFIX || '',
    cors_origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  };
  
  res.json(details);
});

// Rota para verificar conexão com o banco de dados
router.get('/db', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await sequelize.authenticate({ timeout: 30000 }); // 30 segundos de timeout
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    res.json({
      status: 'ok',
      message: 'Conexão com o banco de dados estabelecida com sucesso',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      dbConfig: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'planejador',
        user: process.env.DB_USER || 'root',
        dialectOptions: sequelize.options.dialectOptions
      }
    });
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.error('Erro detalhado na conexão com o banco de dados:', error);
    
    let errorDetail = error.message;
    if (error.original) {
      errorDetail = `${error.name}: ${error.original.code} - ${error.original.message}`;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar com o banco de dados',
      error: errorDetail,
      errorCode: error.original ? error.original.code : 'unknown',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      dbConfig: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'planejador',
        user: process.env.DB_USER || 'root'
      }
    });
  }
});

// Nova rota para inicializar o banco de dados manualmente
router.post('/init-db', async (req, res) => {
  try {
    // Sincroniza os modelos sem usar alter
    await sequelize.sync({ force: false, alter: false });
    
    // Executa os seeders se solicitado
    if (req.query.seed === 'true') {
      await seedDatabase();
    }
    
    res.json({
      status: 'ok',
      message: 'Banco de dados inicializado com sucesso',
      seedExecuted: req.query.seed === 'true',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro detalhado ao inicializar o banco de dados:', error);
    
    let errorDetail = error.message;
    if (error.original) {
      errorDetail = `${error.name}: ${error.original.code} - ${error.original.message}`;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Erro ao inicializar o banco de dados',
      error: errorDetail,
      errorCode: error.original ? error.original.code : 'unknown',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 