// server.js
import express from 'express';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import expressWinston from 'express-winston';
import logger from './config/logger.js';
import jwt from 'jsonwebtoken';
import { sequelize } from './models/index.js';
import seedDatabase from './seeders/index.js';
import { writeFileSync } from 'fs';
import router from './routes/index.js';
import { telegramService } from './services/telegramService.js';
import app from './app.js';

dotenv.config();

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Salva o PID do processo em um arquivo
writeFileSync('./pid.log', process.pid.toString());

// Função para desligar o servidor graciosamente
const gracefulShutdown = (server) => {
  console.log('Iniciando desligamento gracioso...');
  
  server.close(() => {
    console.log('Servidor HTTP fechado.');
    
    // Fechar conexão com banco de dados
    sequelize.close().then(() => {
      console.log('Conexão com banco de dados fechada.');
      process.exit(0);
    }).catch((err) => {
      console.error('Erro ao fechar conexão com banco de dados:', err);
      process.exit(1);
    });
  });

  // Se o servidor não fechar em 10s, forçar
  setTimeout(() => {
    console.error('Não foi possível fechar conexões em tempo, forçando saída');
    process.exit(1);
  }, 10000);
};

// Função para iniciar o servidor
const startServer = async () => {
  try {
    // Autenticar conexão com banco
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');

    // Sincronizar modelos com banco
    await sequelize.sync({ force: true });
    console.log('Modelos sincronizados com banco de dados.');

    // Executar seeders
    await seedDatabase();
    console.log('Dados iniciais carregados com sucesso.');

    // Iniciar servidor HTTP
    const server = app.listen(process.env.PORT || 5000, () => {
      console.log('=================================');
      console.log(`🚀 Servidor rodando na porta ${process.env.PORT || 5000}`);
      console.log('=================================');
    });

    // Inicializar serviço do Telegram se token estiver configurado
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await telegramService.init();
        console.log('Bot do Telegram inicializado com sucesso');
      } catch (error) {
        console.error('Erro ao inicializar bot do Telegram:', error);
      }
    }

    // Configurar handlers para desligamento gracioso
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();