// server.js
import express from 'express';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import expressWinston from 'express-winston';
import logger from './config/logger.js';
import { getCache, setCache } from './config/cache.js';
import jwt from 'jsonwebtoken';
import db from './models/index.js';
import seedDatabase from './seeders/index.js';
import spreadsheetRoutes from './routes/spreadsheetRoutes.js';
import fs from 'fs';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config();

// Configura SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

// Configurações de segurança avançadas
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "same-origin" },
  xssFilter: true,
}));

// CORS configurado para produção
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuração de logging melhorada
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  ignoreRoute: function (req, res) { 
    return false; 
  }
}));

// Rate limiting configurável
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { 
    message: 'Muitas requisições, tente novamente em alguns minutos.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', limiter);

// Middleware de autenticação melhorado
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const cacheKey = `user:${decoded.userId}`;
    let user = await getCache(cacheKey);
    
    if (!user) {
      user = await db.User.findByPk(decoded.userId);
      if (user) {
        await setCache(cacheKey, user, 3600); // Cache por 1 hora
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    logger.error('Erro na autenticação:', error);
    res.status(500).json({ message: 'Erro ao autenticar usuário' });
  }
};

// Configuração das rotas
import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

import expensesRoutes from './routes/expenses.js';
app.use('/api/expenses', authenticate, expensesRoutes);

import dashboardRoutes from './routes/dashboard.js';
app.use('/api/dashboard', authenticate, dashboardRoutes);

import banksRouter from './routes/banks.js';
app.use('/api/bank', authenticate, banksRouter);

import userRouter from './routes/user.js';
app.use('/api/user', authenticate, userRouter);

import categoriesRouter from './routes/categories.js';
app.use('/api/categories', authenticate, categoriesRouter);

import incomesRouter from './routes/incomes.js';
app.use('/api/incomes', authenticate, incomesRouter);

app.use('/api/spreadsheet', authenticate, spreadsheetRoutes);

// Middleware de tratamento de erros global melhorado
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicialização do servidor com tratamento de erros
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.sequelize.sync();
    logger.info('Banco de dados sincronizado');
    
    if (process.env.NODE_ENV !== 'production') {
      await seedDatabase();
      logger.info('Seed concluído');
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('=================================');
      logger.info(`Servidor rodando na porta ${PORT}`);
      logger.info(`Ambiente: ${process.env.NODE_ENV}`);
      logger.info(`PID do processo: ${process.pid}`);
      logger.info('=================================');
    });

    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('Erro não capturado:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promessa rejeitada não tratada:', reason);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Iniciando shutdown gracioso...');
      
      server.close(async () => {
        logger.info('Servidor HTTP fechado');
        
        try {
          await db.sequelize.close();
          logger.info('Conexão com o banco de dados fechada');
          process.exit(0);
        } catch (error) {
          logger.error('Erro ao fechar conexão com o banco:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Salvar PID em arquivo
fs.writeFileSync('pid.log', `Process ID: ${process.pid}\n`);

startServer();
