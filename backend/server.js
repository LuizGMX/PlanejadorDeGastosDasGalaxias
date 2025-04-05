import express from 'express';
import cors from 'cors';
import path from 'path';
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
import { Sequelize } from 'sequelize';
import healthRoutes from './routes/healthRoutes.js';
import { configureRateLimit, authLimiter } from './middleware/rateLimit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiting global
app.use(configureRateLimit());

// Define API_PREFIX from environment variable with "api" as default
const API_PREFIX = `${process.env.API_PREFIX || ''}`;

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

const migrationScriptPath = './migrations/removeSubcategories.js';

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');

    try {
      console.log('Executando migração para remover subcategorias...');
      try {
        const migrationModule = await import(migrationScriptPath);
        if (migrationModule && migrationModule.default) {
          await migrationModule.default(sequelize);
          console.log('Migração de subcategorias concluída com sucesso.');
        } else {
          console.warn('Módulo de migração importado, mas não contém função padrão.');
        }
      } catch (importError) {
        console.warn('Não foi possível importar o script de migração:', importError.message);
        console.log('Tentando solução alternativa...');
        await executeManualMigration();
      }
    } catch (migrationError) {
      console.warn('Aviso ao executar migração de subcategorias:', migrationError.message);
      console.log('Continuando inicialização do servidor...');
    }

    async function executeManualMigration() {
      const transaction = await sequelize.transaction();
      try {
        console.log('Executando migração manual para remover subcategorias');
        const tables = ['expenses', 'incomes', 'recurrence_rules'];
        for (const table of tables) {
          try {
            const hasColumn = await sequelize.query(
              `SHOW COLUMNS FROM ${table} LIKE 'subcategory_id'`,
              { type: Sequelize.QueryTypes.SELECT, transaction }
            );
            if (hasColumn.length > 0) {
              console.log(`Removendo coluna subcategory_id da tabela ${table}`);
              await sequelize.query(`ALTER TABLE ${table} DROP COLUMN subcategory_id`, {
                transaction
              });
              console.log(`Coluna subcategory_id removida da tabela ${table}`);
            } else {
              console.log(`Tabela ${table} não possui coluna subcategory_id`);
            }
          } catch (error) {
            console.log(`Erro ao remover coluna de ${table}:`, error.message);
          }
        }
        try {
          const hasTable = await sequelize.query(
            `SHOW TABLES LIKE 'subcategories'`,
            { type: Sequelize.QueryTypes.SELECT, transaction }
          );
          if (hasTable.length > 0) {
            console.log('Removendo tabela subcategories');
            await sequelize.query(`DROP TABLE subcategories`, { transaction });
            console.log('Tabela subcategories removida com sucesso');
          } else {
            console.log('Tabela subcategories não existe');
          }
        } catch (error) {
          console.log('Erro ao remover tabela subcategories:', error.message);
        }
        await transaction.commit();
        console.log('Migração manual concluída');
      } catch (error) {
        await transaction.rollback();
        console.error('Erro na migração manual:', error);
      }
    }

    await sequelize.sync({ force: false, alter: true });
    console.log('Modelos sincronizados com banco de dados.');

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

startServer();
