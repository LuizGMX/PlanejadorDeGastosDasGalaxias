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
import { writeFileSync } from 'fs';
import telegramService from './services/telegramService.js';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Salva o PID do processo em um arquivo
writeFileSync('./pid.log', process.pid.toString());

const PORT = process.env.PORT || 5000;

// Função para encerrar o servidor graciosamente
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Iniciando encerramento gracioso do servidor... (${signal})`);
  
  try {
    // Para o bot do Telegram
    await telegramService.stop();
    
    // Fecha a conexão com o banco de dados
    await sequelize.close();
    console.log('✅ Conexão com o banco de dados fechada.');
    
    console.log('✅ Servidor encerrado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar o servidor:', error);
    process.exit(1);
  }
};

// Registra os handlers para diferentes sinais
const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
signals.forEach(signal => {
  process.once(signal, () => gracefulShutdown(signal));
});

// Sincroniza o banco de dados e inicia o servidor
const startServer = async () => {
  try {
    // Testa a conexão com o banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');

    // Sincroniza o banco de dados
    await syncDatabase();
    console.log('Banco de dados sincronizado e populado com sucesso!');
    
    await seedDatabase();
    console.log('Seed concluído');

    // Inicia o servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('=================================');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📝 PID do processo: ${process.pid}`);
      console.log('=================================');
    });

    // Adiciona handler para erros do servidor
    server.on('error', (error) => {
      console.error('❌ Erro no servidor:', error);
      gracefulShutdown('SERVER_ERROR');
    });

    // Adiciona handler para erros não tratados
    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não tratado:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    console.log('Iniciando serviço do Telegram...');
    // Inicia o bot do Telegram
    await telegramService.start();
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();