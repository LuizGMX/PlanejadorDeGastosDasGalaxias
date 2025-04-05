import express from 'express';
import os from 'os';
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
    node_version: process.version
  };
  
  res.json(details);
});

export default router; 