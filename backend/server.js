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

import healthRoutes from './routes/healthRoutes.js';
import { configureRateLimit, authLimiter } from './middleware/rateLimit.js';

// Importar middleware de verificação de assinatura
import { checkSubscription } from './middleware/subscriptionCheck.js';

import net from 'net';

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
    origin:  'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Accept'],
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiting global
app.use(configureRateLimit());

// Middleware para injetar contexto nos models
app.use(injectModelContext);

// Middleware para mascarar dados sensíveis
app.use(maskSensitiveData);

// Middleware para logs de auditoria
app.use(auditLogMiddleware);

// Define API_PREFIX from environment variable with "api" as default
const API_PREFIX = process.env.NODE_ENV === 'production' 
  ? (process.env.API_PREFIX && process.env.API_PREFIX.trim() !== '' ? `/${process.env.API_PREFIX}` : '')
  : '/api';

console.log("API_PREFIX " + API_PREFIX);

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
app.use(`${API_PREFIX}/health`, healthRoutes);
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

let server;

if (process.env.NODE_ENV === 'production') {

  const staticPath = '/var/www/PlanejadorDeGastosDasGalaxias/frontend/build';
  app.use(express.static(staticPath));

  // Rota fallback para SPA, apenas para rotas não iniciadas com o prefixo da API
  app.get('*', (req, res) => {
    if (!req.path.startsWith(API_PREFIX)) {
      res.sendFile('index.html', { root: staticPath });
    }
  });

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
  server.listen(5000, '0.0.0.0', () => {
    console.log('🚀 Servidor HTTPS rodando na porta 5000 em modo produção');
  });
} else {
  server = http.createServer(app);
  server.listen(5000, () => {
    console.log('🚀 Servidor HTTP rodando na porta 5000 em modo desenvolvimento');
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

    // Verificar se a porta está em uso
    const checkPort = () => {
      return new Promise((resolve, reject) => {
        const tester = net.createServer()
          .once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.error('⚠️ A porta 5000 já está em uso. Por favor, verifique se há outro processo rodando.');
              process.exit(1);
            }
            reject(err);
          })
          .once('listening', () => {
            tester.once('close', () => resolve())
              .close();
          })
          .listen(5000);
      });
    };

    await checkPort();

    // Inicializar o servidor apenas uma vez
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

    server.listen(5000, process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined, () => {
      console.log(`🚀 Servidor ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP'} rodando na porta 5000 em modo ${process.env.NODE_ENV || 'desenvolvimento'}`);
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