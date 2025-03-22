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
import app from './app.js';
import sequelize, { syncDatabase } from './config/db.js';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const PORT = process.env.PORT || 5000;

// Sincroniza o banco de dados e inicia o servidor
const startServer = async () => {
  try {
    // Testa a conexão com o banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');

    // Sincroniza o banco de dados
    await syncDatabase();

    // Remove a sincronização duplicada
    // await db.sequelize.sync();
    console.log('Banco de dados sincronizado');
    
    await seedDatabase();
    console.log('Seed concluído');

    // Inicia o servidor
    app.listen(PORT, '0.0.0.0', () => {
      console.log('=================================');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📝 PID do processo: ${process.pid}`);
      console.log('=================================');
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();