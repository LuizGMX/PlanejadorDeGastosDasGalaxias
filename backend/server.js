import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
import recurrencesRouter from './routes/recurrences.js';
import telegramRoutes from './routes/telegramRoutes.js';
import { sequelize } from './models/index.js';
import seedDatabase from './database/seeds/index.js';
import { telegramService } from './services/telegramService.js';

import healthRoutes from './routes/healthRoutes.js';
import { configureRateLimit, authLimiter } from './middleware/rateLimit.js';

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

// Define API_PREFIX from environment variable with "api" as default
const API_PREFIX = process.env.NODE_ENV === 'production' 
  ? (process.env.API_PREFIX && process.env.API_PREFIX.trim() !== '' ? `/${process.env.API_PREFIX}` : '')
  : '/api';

console.log("API_PREFIX " + API_PREFIX);

// Rotas da API
app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/incomes`, incomeRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/banks`, bankRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);
app.use(`${API_PREFIX}/spreadsheet`, spreadsheetRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/recurrences`, recurrencesRouter);
app.use(`${API_PREFIX}/telegram`, telegramRoutes);
app.use(`${API_PREFIX}/health`, healthRoutes);

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
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');

    // Verificar variável de ambiente para decidir se deve alterar o banco de dados
    const shouldAlterDatabase = process.env.ALTER_DATABASE === 'true';
    
    // Sincronizar modelos com o banco de dados, sem alter por padrão
    await sequelize.sync({ 
      force: false, 
      alter: shouldAlterDatabase, 
      hooks: true
    });
    
    console.log(`Modelos sincronizados com banco de dados. Modo alter: ${shouldAlterDatabase ? 'ativado' : 'desativado'}`);

    if (process.env.RUN_SEEDERS === 'true') {
      await seedDatabase();
      console.log('Dados iniciais carregados com sucesso.');
    } else {
      console.log('Seeders ignorados. Configure RUN_SEEDERS=true para executá-los.');
    }

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await telegramService.init();
        console.log('Bot do Telegram inicializado com sucesso');
      } catch (error) {
        console.error('Erro ao inicializar bot do Telegram:', error);
      }
    }

    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
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

app.get('/', (req, res) => {
  res.send('Backend está funcionando');
});

startServer();