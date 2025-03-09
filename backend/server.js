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

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();

// Configurações de segurança
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5
});

app.use('/api/auth', authLimiter);

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', err);
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tenta buscar usuário do cache
    const cacheKey = `user:${decoded.userId}`;
    let user = await getCache(cacheKey);
    
    if (!user) {
      user = await db.User.findByPk(decoded.userId);
      if (user) {
        await setCache(cacheKey, user);
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

// Rotas
import authRoutes from './routes/auth.js';
app.use('/api/auth', (req, res, next) => { 
  logger.info('Rota de autenticação acessada', { path: req.path }); 
  next(); 
}, authRoutes);

import expensesRoutes from './routes/expenses.js';
app.use('/api/expenses', authenticate, expensesRoutes);

import dashboardRoutes from './routes/dashboard.js';
app.use('/api/dashboard', authenticate, dashboardRoutes);

import banksRouter from './routes/banks.js';
app.use('/api/bank', banksRouter);

// Sincronizar banco de dados e adicionar dados iniciais apenas se necessário
(async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await db.sequelize.sync({ force: true });
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      
      const categoryCount = await db.Category.count();
      if (categoryCount === 0) {
        await db.Category.bulkCreate([
          { category_name: 'Alimentação' },
          { category_name: 'Transporte' },
          { category_name: 'Moradia' },
          { category_name: 'Saúde' },
          { category_name: 'Educação' },
          { category_name: 'Lazer' },
          { category_name: 'Vestuário' },
          { category_name: 'Contas (água, luz, internet)' },
          { category_name: 'Impostos' },
          { category_name: 'Outros' },
        ]);
        logger.info('Categorias iniciais criadas');
      }
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => logger.info(`Servidor rodando na porta ${PORT}`));
  } catch (error) {
    logger.error('Erro ao sincronizar banco de dados:', error);
    process.exit(1);
  }
})();
