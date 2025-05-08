import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync } from 'fs';
import http from 'http';
import https from 'https';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import expenseRoutes from './routes/expenses.js';
import incomeRoutes from './routes/incomes.js';
import dashboardRoutes from './routes/dashboard.js';
import bankRoutes from './routes/banks.js';
import budgetRoutes from './routes/budgets.js';
import spreadsheetRoutes from './routes/spreadsheetRoutes.js';
import userRoutes from './routes/users.js';
import telegramRoutes from './routes/telegramRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userDataRoutes from './routes/userData.js';
import { models } from './models/index.js';
import seedDatabase from './database/seeds/index.js';
import { telegramService } from './services/telegramService.js';
import { maskSensitiveData } from './middleware/dataMasking.js';
import { auditLogMiddleware } from './middleware/auditLog.js';
import { injectModelContext } from './middleware/modelContextMiddleware.js';
import { authenticate } from './middleware/auth.js';
import sequelize from './config/db.js';

import healthRoutes from './routes/healthRoutes.js';
import { configureRateLimit, authLimiter } from './middleware/rateLimit.js';

// Importar middleware de verificação de assinatura
import { checkSubscription } from './middleware/subscriptionCheck.js';

import net from 'net';
import { configureTimeouts } from './middleware/timeout.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://planejadordasgalaxias.com.br", "http://localhost:5000", "http://localhost:3000"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));

app.use(
  cors({
    // origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    origin: function(origin, callback) {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://planejadordasgalaxias.com.br',
        process.env.FRONTEND_URL
      ].filter(Boolean); // Remove valores undefined ou vazios
      
      // Permitir requisições sem origem (como de aplicações mobile ou curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`Origem bloqueada pelo CORS: ${origin}`);
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // Cache da preflight por 24 horas
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Define API_PREFIX from environment variable with "api" as default
const API_PREFIX = process.env.NODE_ENV === 'production' 
  ? (process.env.API_PREFIX && process.env.API_PREFIX.trim() !== '' ? `/${process.env.API_PREFIX}` : '')
  : '/api';

console.log("API_PREFIX " + API_PREFIX);

// ===== ROTAS PRIORITÁRIAS =====
// Estas rotas são processadas antes de qualquer middleware pesado
// para garantir resposta rápida mesmo em situações de sobrecarga

// Adicionar as rotas de saúde ANTES de qualquer middleware pesado
app.use('/health', healthRoutes);
app.use(`${API_PREFIX}/health`, healthRoutes);

// Rota direta para check-email 
app.post('/auth/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ 
        message: !email ? 'E-mail é obrigatório' : 'E-mail inválido' 
      });
    }
    
    // Responder imediatamente para evitar timeout no cliente
    return res.json({
      isNewUser: true,
      name: null,
      email: null,
      message: 'Verificação em andamento. Por favor, continue.'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao verificar email' });
  }
});

app.post(`${API_PREFIX}/auth/check-email`, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ 
        message: !email ? 'E-mail é obrigatório' : 'E-mail inválido' 
      });
    }
    
    // Responder imediatamente para evitar timeout no cliente
    return res.json({
      isNewUser: true,
      name: null,
      email: null,
      message: 'Verificação em andamento. Por favor, continue.'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao verificar email' });
  }
});

// Rota de verificação de código também como prioritária
app.post('/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email e código são obrigatórios' 
      });
    }
    
    // Resposta rápida para evitar timeout
    return res.json({
      message: 'Verificação recebida. Processando...',
      status: 'verifying'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao processar verificação' });
  }
});

app.post(`${API_PREFIX}/auth/verify-code`, async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        message: 'Email e código são obrigatórios' 
      });
    }
    
    // Resposta rápida para evitar timeout
    return res.json({
      message: 'Verificação recebida. Processando...',
      status: 'verifying'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao processar verificação' });
  }
});

// Rota de login como prioritária
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    // Resposta básica para evitar timeout
    return res.json({
      message: 'Autenticação em processamento...',
      status: 'authenticating'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro no login' });
  }
});

app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    // Resposta básica para evitar timeout
    return res.json({
      message: 'Autenticação em processamento...',
      status: 'authenticating'
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro no login' });
  }
});

// ===== MIDDLEWARES E ROTAS REGULARES =====

// Limite de tamanho do body JSON para evitar problemas
app.use(express.json({ limit: '10mb' }));  // Reduzido para 10mb
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Aplicar o middleware de timeout SOMENTE após as rotas prioritárias
app.use(configureTimeouts());

// Aplicar rate limiting global
app.use(configureRateLimit());

// Middleware para injetar contexto nos models
app.use(injectModelContext);

// Middleware para mascarar dados sensíveis
app.use(maskSensitiveData);

// Middleware para logs de auditoria
app.use(auditLogMiddleware);

// Adicionar middleware para verificar a saúde da conexão antes de processar requisições críticas
app.use(async (req, res, next) => {
  // Apenas verificar em rotas que não são healthcheck para evitar ciclos
  if (!req.path.includes('/health') && !req.path.includes('/auth/check-email') && !req.path.includes('/auth/verify-code')) {
    try {
      // A cada 100 requisições, verificar a conexão para prevenir problemas
      if (Math.random() < 0.01) {
        await sequelize.authenticate({ timeout: 5000 });
      }
    } catch (error) {
      console.error('❌ Erro de conexão com o banco de dados detectado durante requisição:', error);
      // Não bloquear a requisição, apenas registrar o erro
    }
  }
  next();
});

// Middleware para injetar o parâmetro include_all_recurring nas requisições de despesas e receitas
app.use(`${API_PREFIX}/expenses`, (req, res, next) => {
  // Verifica se é uma solicitação GET e se já não tem o parâmetro include_all_recurring
  if (req.method === 'GET' && !req.query.include_all_recurring) {
    // Se há filtro de mês ou ano, adicione o parâmetro 
    if (req.query.months || req.query.years || req.query['months[]'] || req.query['years[]']) {
      console.log('Adicionando include_all_recurring=true para despesas');
      req.query.include_all_recurring = 'true';
    }
  }
  next();
});

app.use(`${API_PREFIX}/incomes`, (req, res, next) => {
  // Verifica se é uma solicitação GET e se já não tem o parâmetro include_all_recurring
  if (req.method === 'GET' && !req.query.include_all_recurring) {
    // Se há filtro de mês ou ano, adicione o parâmetro 
    if (req.query.months || req.query.years || req.query['months[]'] || req.query['years[]']) {
      console.log('Adicionando include_all_recurring=true para receitas');
      req.query.include_all_recurring = 'true';
    }
  }
  next();
});

// Rotas públicas
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/banks`, bankRoutes);

// Middleware de autenticação para rotas protegidas
app.use(authenticate);

// Rotas protegidas
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/incomes`, incomeRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);
app.use(`${API_PREFIX}/spreadsheet`, spreadsheetRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/telegram`, telegramRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/user-data`, userDataRoutes);

// Middleware para lidar com rotas não encontradas
app.use((req, res, next) => {
  // Ignorar rotas de saúde e estáticas
  if (req.path.includes('/health') || req.path.startsWith('/static')) {
    return next();
  }
  
  console.warn(`🔍 Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Rota não encontrada',
    message: 'O endpoint solicitado não existe neste servidor.',
    path: req.originalUrl
  });
});

// Middleware global para tratamento de erros
app.use((err, req, res, next) => {
  // Registrar o erro com detalhes
  console.error('🚨 ERRO GLOBAL CAPTURADO:');
  console.error(`  Método: ${req.method}`);
  console.error(`  URL: ${req.originalUrl}`);
  console.error(`  Mensagem: ${err.message}`);
  console.error(`  Stack: ${err.stack}`);

  // Verificar se a resposta já foi enviada
  if (res.headersSent) {
    console.error('  As headers já foram enviadas, não é possível enviar resposta de erro.');
    return next(err);
  }

  // Tratar erros de timeout específico do banco de dados
  if (err.name === 'SequelizeConnectionError' || 
      err.name === 'SequelizeConnectionRefusedError' ||
      err.name === 'SequelizeHostNotFoundError' ||
      err.name === 'SequelizeAccessDeniedError' ||
      err.message.includes('timeout')) {
    console.error('  Erro de conexão com o banco de dados detectado');
    return res.status(503).json({
      error: 'Serviço temporariamente indisponível',
      message: 'Erro na conexão com o banco de dados. Por favor, tente novamente mais tarde.'
    });
  }

  // Tratar erros de validação
  if (err.name === 'SequelizeValidationError' || 
      err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      message: 'Os dados enviados são inválidos',
      details: err.errors
    });
  }

  // Resposta genérica para outros tipos de erro
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' 
      ? 'Ocorreu um erro inesperado. Por favor, tente novamente.'
      : err.message
  });
});

let server;

// Adicionar configuração para servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  const staticPath = '/var/www/PlanejadorDeGastosDasGalaxias/frontend/build';
  app.use(express.static(staticPath));

  // Rota fallback para SPA, apenas para rotas não iniciadas com o prefixo da API
  app.get('*', (req, res) => {
    if (!req.path.startsWith(API_PREFIX)) {
      res.sendFile('index.html', { root: staticPath });
    }
  });
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

writeFileSync('./pid.log', process.pid.toString());

const gracefulShutdown = (server) => {
  console.log('Iniciando desligamento gracioso...');
  server.close(() => {
    console.log('Servidor HTTP fechado.');
    sequelize
      .close()
      .then(() => {
        console.log('Conexão com banco de dados fechada.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Erro ao fechar conexão com banco de dados:', err);
        process.exit(1);
      });
  });
  setTimeout(() => {
    console.error('Não foi possível fechar conexões em tempo, forçando saída');
    process.exit(1);
  }, 10000);
};

// Constante para a porta principal e alternativas
const DEFAULT_PORT = 5000;
const ALTERNATIVE_PORTS = [5001, 5002, 5003, 5005, 5010];

const checkPortAvailability = async (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Porta ${port} já está em uso, tentando outra...`);
          resolve(false);
        } else {
          console.error(`❌ Erro ao verificar porta ${port}:`, err.message);
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
};

const findAvailablePort = async (defaultPort, alternativePorts) => {
  // Primeiro, tentamos a porta padrão
  if (await checkPortAvailability(defaultPort)) {
    return defaultPort;
  }
  
  // Se a porta padrão não estiver disponível, tentamos as alternativas
  for (const port of alternativePorts) {
    if (await checkPortAvailability(port)) {
      console.log(`🔄 Usando porta alternativa: ${port}`);
      return port;
    }
  }
  
  // Se nenhuma porta estiver disponível, registramos um erro
  console.error('❌ Todas as portas alternativas estão em uso. Não foi possível iniciar o servidor.');
  return null;
};

const startServer = async () => {
  try {
    // Sincronizar banco de dados na ordem correta
    await sequelize.sync({ force: false });
    
    // Criar tabelas na ordem correta
    await models.User.sync({ force: false });
    await models.Category.sync({ force: false });
    await models.Bank.sync({ force: false });
    await models.Expense.sync({ force: false });
    await models.Income.sync({ force: false });
    await models.Budget.sync({ force: false });
    await models.VerificationCode.sync({ force: false });
    await models.UserBank.sync({ force: false });
    await models.RecurrenceRule.sync({ force: false });
    await models.ExpensesRecurrenceException.sync({ force: false });
    await models.IncomesRecurrenceException.sync({ force: false });
    await models.Payment.sync({ force: false });
    await models.FinancialGoal.sync({ force: false });
    await models.AuditLog.sync({ force: false });

    // Encontrar uma porta disponível
    const port = await findAvailablePort(DEFAULT_PORT, ALTERNATIVE_PORTS);
    
    if (!port) {
      console.error('❌ Não foi possível encontrar uma porta disponível. Encerrando aplicação.');
      process.exit(1);
    }

    // Inicializar o servidor
    if (process.env.NODE_ENV === 'production') {
      const privateKey = readFileSync(
        '/etc/letsencrypt/live/planejadordasgalaxias.com.br/privkey.pem',
        'utf8'
      );
      const certificate = readFileSync(
        '/etc/letsencrypt/live/planejadordasgalaxias.com.br/cert.pem',
        'utf8'
      );
      const ca = readFileSync(
        '/etc/letsencrypt/live/planejadordasgalaxias.com.br/chain.pem',
        'utf8'
      );

      const credentials = { key: privateKey, cert: certificate, ca: ca };
      server = https.createServer(credentials, app);
    } else {
      server = http.createServer(app);
    }

    server.listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined, () => {
      console.log(`🚀 Servidor ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP'} rodando na porta ${port} em modo ${process.env.NODE_ENV || 'desenvolvimento'}`);
      
      // Escrever a porta em uso em um arquivo para referência
      try {
        writeFileSync('./server-port.txt', port.toString());
        console.log(`✅ Porta do servidor (${port}) salva em server-port.txt`);
      } catch (err) {
        console.error('❌ Não foi possível salvar a porta do servidor em arquivo:', err.message);
      }
    });

  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  process.exit(1);
});

// Inicializar o bot do Telegram
telegramService.init().then(() => {
  console.log('🤖 Verificação de inicialização do bot do Telegram concluída');
}).catch(error => {
  console.error('❌ Erro durante a inicialização do bot do Telegram:', error);
});

app.get('/', (req, res) => {
  res.send('Backend está funcionando');
});

process.on('SIGTERM', () => gracefulShutdown(server));
process.on('SIGINT', () => gracefulShutdown(server));

startServer().catch(err => {
  console.error('Erro fatal ao iniciar o servidor:', err);
  process.exit(1);
});