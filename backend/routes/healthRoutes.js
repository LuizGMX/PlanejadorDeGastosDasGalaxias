import express from 'express';
import sequelize from '../config/db.js';
import os from 'os';

const router = express.Router();

// Status do sistema
const systemStatus = {
  startTime: new Date(),
  lastDatabaseCheck: null,
  lastSuccessfulDatabaseCheck: null,
  databaseConnected: false,
  lastError: null,
  requestsServed: 0,
  slowRequests: 0,
  errors: 0
};

// Contadores para métricas
let requestCounter = 0;

// Rota de verificação rápida - resposta imediata
router.get('/', (req, res) => {
  systemStatus.requestsServed++;
  res.status(200).json({
    status: 'up',
    timestamp: new Date(),
    message: 'Servidor está respondendo'
  });
});

// Rota detalhada de saúde do sistema - verifica componentes
router.get('/check', async (req, res) => {
  systemStatus.requestsServed++;
  const startTime = Date.now();
  
  try {
    // Verificar conexão com banco de dados
    systemStatus.lastDatabaseCheck = new Date();
    await sequelize.authenticate({ timeout: 5000 });
    systemStatus.databaseConnected = true;
    systemStatus.lastSuccessfulDatabaseCheck = new Date();
    
    // Coletar métricas do sistema
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const loadAvg = os.loadavg();
    
    const elapsedTime = Date.now() - startTime;
    
    // Verificar se a resposta foi lenta
    if (elapsedTime > 1000) {
      systemStatus.slowRequests++;
    }
    
    res.status(200).json({
      status: 'healthy',
      server: {
        uptime: uptime,
        uptimeFormatted: formatUptime(uptime),
        timestamp: new Date(),
        responseTime: `${elapsedTime}ms`,
        startTime: systemStatus.startTime,
        environment: process.env.NODE_ENV || 'development',
        host: os.hostname()
      },
      system: {
        platform: process.platform,
        arch: os.arch(),
        cpus: os.cpus().length,
        loadAverage: loadAvg,
        freeMemory: formatBytes(freeMemory),
        totalMemory: formatBytes(totalMemory),
        memoryUsagePercent: ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2) + '%',
        processMemory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external)
        }
      },
      database: {
        connected: systemStatus.databaseConnected,
        lastCheck: systemStatus.lastDatabaseCheck,
        lastSuccessfulCheck: systemStatus.lastSuccessfulDatabaseCheck
      },
      metrics: {
        totalRequests: systemStatus.requestsServed,
        slowRequests: systemStatus.slowRequests,
        errors: systemStatus.errors
      }
    });
  } catch (error) {
    systemStatus.databaseConnected = false;
    systemStatus.lastError = {
      time: new Date(),
      message: error.message,
      stack: error.stack
    };
    systemStatus.errors++;
    
    // Responder com erro, mas ainda fornecer informações úteis
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date(),
      message: 'Problemas detectados na verificação de saúde',
      error: error.message,
      databaseConnected: false,
      server: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
});

// Rota para verificação detalhada do banco de dados
router.get('/database', async (req, res) => {
  try {
    // Verificar conexão básica
    const startTime = Date.now();
    await sequelize.authenticate({ timeout: 3000 });
    
    // Fazer uma consulta simples para testar a funcionalidade
    const [result] = await sequelize.query('SELECT 1+1 AS result');
    const queryTime = Date.now() - startTime;
    
    // Verificar se o pool de conexões está saudável
    const poolInfo = {
      size: sequelize.connectionManager.pool.size,
      idle: sequelize.connectionManager.pool.idle,
      used: sequelize.connectionManager.pool.used
    };
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date(),
      message: 'Conexão com banco de dados funcionando corretamente',
      responseTime: `${queryTime}ms`,
      queryResult: result,
      pool: poolInfo,
      databaseInfo: {
        dialect: sequelize.options.dialect,
        host: sequelize.options.host,
        port: sequelize.options.port,
        database: sequelize.options.database,
        username: sequelize.options.username
      }
    });
  } catch (error) {
    systemStatus.errors++;
    res.status(503).json({
      status: 'error',
      timestamp: new Date(),
      message: 'Erro na conexão com banco de dados',
      error: error.message
    });
  }
});

// Rota para limpar cache e reiniciar contadores - apenas em desenvolvimento
router.post('/reset', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    // Zerar contadores
    systemStatus.requestsServed = 0;
    systemStatus.slowRequests = 0;
    systemStatus.errors = 0;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date(),
      message: 'Contadores de saúde reiniciados'
    });
  } else {
    res.status(403).json({
      status: 'forbidden',
      message: 'Esta operação só é permitida em ambiente de desenvolvimento'
    });
  }
});

// Função para formatar bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Função para formatar tempo de atividade
function formatUptime(uptime) {
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  const seconds = Math.floor(uptime % 60);
  
  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0) result += `${minutes}m `;
  result += `${seconds}s`;
  
  return result;
}

// Configurar verificação periódica automatizada
const healthCheckInterval = 5 * 60 * 1000; // 5 minutos
setInterval(async () => {
  try {
    await sequelize.authenticate({ timeout: 3000 });
    systemStatus.lastDatabaseCheck = new Date();
    systemStatus.lastSuccessfulDatabaseCheck = new Date();
    systemStatus.databaseConnected = true;
    // console.log('✅ Verificação de saúde automática: OK');
  } catch (error) {
    systemStatus.databaseConnected = false;
    systemStatus.lastError = {
      time: new Date(),
      message: error.message
    };
    systemStatus.errors++;
    console.error('❌ Verificação de saúde automática falhou:', error.message);
  }
}, healthCheckInterval);

export default router; 