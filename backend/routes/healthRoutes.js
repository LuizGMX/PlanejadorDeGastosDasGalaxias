import express from 'express';
import os from 'os';
import { sequelize, models } from '../models/index.js';
import seedDatabase from '../database/seeds/index.js';

const router = express.Router();

// Endpoint simples para verificar se a API está funcionando
router.get('/', async (req, res) => {
  try {
    // Verificar a conexão com o banco de dados
    await sequelize.authenticate();
    
    res.json({
      status: 'ok',
      message: 'API em funcionamento',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar saúde da API:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao verificar a saúde da API',
      error: error.message
    });
  }
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
    node_version: process.version
  };
  
  res.json(details);
});

// Rota para verificar conexão com o banco de dados
router.get('/db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      message: 'Conexão com o banco de dados estabelecida com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar com o banco de dados',
      error: error.message,
      timestamp: new Date().toISOString()
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
    res.status(500).json({
      status: 'error',
      message: 'Erro ao inicializar o banco de dados',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Nova rota para status simplificado da API
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

export default router; 